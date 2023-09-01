const admin = require("firebase-admin");
const serviceAccount = require('../techfinderus-firebase-adminsdk-ps8d5-ee61125c2d.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://techfinderus.firebaseio.com"
});
function sendNotification(data) {
    const message = {
        notification: {
            body: data.body,
            title: data.title
        },
        tokens: data.tokens
    }
    admin.messaging().sendMulticast(message)
        .then((response) => {
            if (response.failureCount > 0) {
                const failedTokens = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        failedTokens.push(data.tokens[idx]);
                    }
                });
                console.log('List of tokens that caused failures: ' + failedTokens);
            }
            return 'done'
        })
}

module.exports =sendNotification;