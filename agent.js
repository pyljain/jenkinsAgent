const AWS = require('aws-sdk')
const instanceId = process.argv[2]
const documentClient = new AWS.DynamoDB.DocumentClient({
    region: 'us-east-2'
})

const SQS = new AWS.SQS({
    region: 'us-east-2'
})

const UI_UPDATE_QUEUE = 'https://sqs.us-east-2.amazonaws.com/287634355245/JenkinsUIUpdates'

console.log('Argument passed is', instanceId)

const updateDB = () => new Promise((resolve, reject) => {
    const updateDBParams = {
        TableName: 'JemkinsInstances',
        Item: {
            id: instanceId,
            status: 'Ready'
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


updateDB()
    .then(() => updateUIMsg())
    .catch((e) => console.log(e))