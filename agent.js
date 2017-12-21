const AWS = require('aws-sdk')
const instanceId = process.argv[2]
const documentClient = new AWS.DynamoDB.DocumentClient({
    region: 'us-east-2'
})

const SQS = new AWS.SQS({
    region: 'us-east-2'
})

const request = require('request')

const UI_UPDATE_QUEUE = 'https://sqs.us-east-2.amazonaws.com/287634355245/JenkinsUIUpdates'

console.log('Argument passed is', instanceId)

const updateDB = (hostname) => new Promise((resolve, reject) => {
    const url = `http://${hostname}`
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

// updateDB()
//     .then(() => getPublicHostName())
//     .then(() => updateUIMsg())
//     .catch((e) => console.log(e))

getPublicHostName()
    .then((hostname) => updateDB(hostname))
    .then(() => updateUIMsg())
    .catch((e) => console.log(e))