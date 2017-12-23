const AWS = require('aws-sdk')
const instanceId = process.argv[2]
const documentClient = new AWS.DynamoDB.DocumentClient({
    region: 'us-east-2'
})

const fs = require('fs')

const SQS = new AWS.SQS({
    region: 'us-east-2'
})

const sns = new AWS.SNS({
    region: 'us-east-2'
})

const request = require('request')

const UI_UPDATE_QUEUE = 'https://sqs.us-east-2.amazonaws.com/287634355245/JenkinsUIUpdates'
const SNS_TOPIC_ARN = 'arn:aws:sns:us-east-2:287634355245:S3DownloadNotification'
const JENKINS_ADMIN_PASSWORD_LOCATION = '/var/lib/jenkins/secrets/initialAdminPassword'

console.log('Argument passed is', instanceId)

const updateDB = (hostname) => new Promise((resolve, reject) => {
    const url = `http://${hostname}:8080`
    const updateDBParams = {
        TableName: 'JemkinsInstances',
        Item: {
            id: instanceId,
            status: 'Ready',
            hostname: url
        }
    }

    documentClient.put(updateDBParams, (err, data) => {
        if (err) {
            reject(err)
        } else {
            resolve()
        }
    })
})


const updateUIMsg = () => new Promise((resolve, reject) => {
    const uiParams = {
        QueueUrl : UI_UPDATE_QUEUE,
        MessageBody : 'Refresh'
    }

    SQS.sendMessage(uiParams, (err, result) => {
        if (err){
            reject(err)
        } else {
            resolve()
        }
    })
})

const getPublicHostName = () => new Promise((resolve, reject) => {
    request('http://169.254.169.254/latest/meta-data/public-hostname', {}, (err, res, body) => {
        if(err){
            reject(err)
        } else {
            console.log('Hostname body is', body)
            resolve(body)
        }
    })
})

const fetchAdminPassword = () => new Promise((resolve, reject) => {
    const password = fs.readFile(JENKINS_ADMIN_PASSWORD_LOCATION, (err, data) => {
        if (err){
            reject(err)
        } else {
            resolve(data.toString())
        }
    })
})

const sendEmailwithPassword = (password) => new Promise((resolve, reject) => {
    const params = {
        TopicArn: SNS_TOPIC_ARN,
        Subject: 'Jenkins Admin Password',
        Message: `Dear User,
                  
                  Your jenkins password for the instance ${instanceId} is ${password}`
    }

    sns.publish(params, (err, data) => {
        if(err) {
            reject(err)
        } else {
            resolve(data)
        }
    })
})

// updateDB()
//     .then(() => getPublicHostName())
//     .then(() => updateUIMsg())
//     .catch((e) => console.log(e))

getPublicHostName()
    .then((hostname) => updateDB(hostname))
    .then(() => fetchAdminPassword())
    .then((adminpassword) => sendEmailwithPassword(adminpassword))
    .then(() => updateUIMsg())
    .catch((e) => console.log(e))