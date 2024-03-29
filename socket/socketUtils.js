'use strict';
var sessionRouter = require('../router/sessionRouter.js');
var questionRouter = require('../router/questionRouter.js');
var Answer = require('../data/answerSchema.js');
var utils = {};

utils.setUpSocket = function(io) {
    const accountSessionSocketMap = {}; // { accountA : {session : session, isConnect : true/fasle, socket : socket, currentWaitingCheckAttempt : { attempt: {question: question, answer: answer} } }}
    const accountQueue = [];
    var counter = 0;
    io.on('connection', function(socket) {
        socket.on('account', function(data) {
            if (accountSessionSocketMap[data.account.accountId]) {
                socket._userName = "invalid_socket";
                socket.emit('account already has socket', {});
            } else {
                socket._userName = data.account.accountId;
                accountSessionSocketMap[data.account.accountId] = {};
                accountSessionSocketMap[data.account.accountId].isConnect = false;
                accountSessionSocketMap[data.account.accountId].socket = socket;
                accountSessionSocketMap[data.account.accountId].accountName = data.account.accountName;
                accountSessionSocketMap[data.account.accountId].questionSetId = data.questionSetId;
                accountSessionSocketMap[data.account.accountId].currentWaitingCheckAttempt = {};
                sessionRouter.getSessionById(data.account.accountId, data.questionSetId).then(function(sessions) {
                    if (sessions && sessions.length) {
                        accountSessionSocketMap[data.account.accountId].session = sessions[0] || {};
                        let isA = accountSessionSocketMap[data.account.accountId].session.accountAId === data.account.accountId;
                        let otherAccountId = isA ? accountSessionSocketMap[data.account.accountId].session.accountBId : accountSessionSocketMap[data.account.accountId].session.accountAId;
                        Answer.find({accountId: otherAccountId, questionSetId: data.questionSetId, currentGiveUpNumber: null}).lean().exec(function(err, result) {
                            let otherAttemptAnswers = [];
                            if (err) {
                                console.log('Cannot get answer ' + req.params.accountId);
                            }
                            if (result && result.length) {
                                for (let answer of result[0].answers) {
                                    otherAttemptAnswers.push(answer.attemptedAnswers);
                                }
                            }
                            socket.emit('account received', {
                                otherAttemptAnswers: otherAttemptAnswers,
                                session : accountSessionSocketMap[data.account.accountId].session,
                                questionSet : questionRouter.getQuestionSet(data.questionSetId, isA)
                            });
                        });
                    } else {
                        accountSessionSocketMap[data.account.accountId].session = {};
                        socket.emit('account received', {});
                    }
                });
            }
        });

        socket.on('queueing', function() {
            if (socket._userName == "invalid_socket") {
                socket.emit('account already has socket', {});
                return;
            }
            if (accountQueue.length) {
                // someone in queue
                if (accountSessionSocketMap[socket._userName].session && accountSessionSocketMap[socket._userName].session._id) {
                    // account had collaborate this question set with someone before
                    let index = accountQueue.indexOf(accountSessionSocketMap[socket._userName].session.accountAId);
                    if (index == -1) {
                        index = accountQueue.indexOf(accountSessionSocketMap[socket._userName].session.accountBId);
                    }
                    if (index > -1) {
                        // found the collaborated account
                        accountSessionSocketMap[socket._userName].isConnect = true;
                        socket._roomName = accountSessionSocketMap[socket._userName].session._id.toString();
                        let matchedAccountId = accountQueue.splice(index, 1)[0];
                        accountSessionSocketMap[matchedAccountId].isConnect = true;
                        accountSessionSocketMap[matchedAccountId].socket._roomName = accountSessionSocketMap[socket._userName].session._id.toString();
                        // make reference the same
                        accountSessionSocketMap[matchedAccountId].currentWaitingCheckAttempt = accountSessionSocketMap[socket._userName].currentWaitingCheckAttempt;
                        accountSessionSocketMap[matchedAccountId].session = accountSessionSocketMap[socket._userName].session;
                        socket.join(socket._roomName);
                        accountSessionSocketMap[matchedAccountId].socket.join(socket._roomName);
                        let isA = accountSessionSocketMap[socket._userName].session.accountAId == socket._userName;
                        socket.emit('account matched', {
                            session : accountSessionSocketMap[socket._userName].session,
                            questionSet : questionRouter.getQuestionSet(accountSessionSocketMap[socket._userName].questionSetId, isA)
                        });
                        accountSessionSocketMap[matchedAccountId].socket.emit('account matched', {
                            session : accountSessionSocketMap[socket._userName].session,
                            questionSet : questionRouter.getQuestionSet(accountSessionSocketMap[socket._userName].questionSetId, !isA)
                        });
                    } else {
                        // did not find the collaborated account, put current account into queue
                        accountQueue.push(socket._userName);
                        socket.emit('account in queue', {});
                    }
                } else {
                    // first time to do this question set
                    socket._roomName = "First Time Room " + counter;
                    let index = -1;
                    for (let i = 0; i < accountQueue.length; i++) {
                        if (!accountSessionSocketMap[accountQueue[i]].session._id) {
                            index = i;
                            break;
                        }
                    }
                    if (index > -1) {
                        let matchedAccountId = accountQueue.splice(index, 1)[0];
                        accountSessionSocketMap[socket._userName].isConnect = true;
                        accountSessionSocketMap[socket._userName].session = {
                            accountAId : socket._userName,
                            accountAName : accountSessionSocketMap[socket._userName].accountName,
                            accountBId : matchedAccountId,
                            accountBName : accountSessionSocketMap[matchedAccountId].accountName,
                            questionSetId : accountSessionSocketMap[socket._userName].questionSetId,
                            messages : [],
                            createdDate : new Date()
                        };
                        accountSessionSocketMap[matchedAccountId].socket._roomName = "First Time Room " + counter;
                        accountSessionSocketMap[matchedAccountId].isConnect = true;
                        // make reference the same
                        accountSessionSocketMap[matchedAccountId].currentWaitingCheckAttempt = accountSessionSocketMap[socket._userName].currentWaitingCheckAttempt;
                        accountSessionSocketMap[matchedAccountId].session = accountSessionSocketMap[socket._userName].session;
                        counter++;
                        socket.join(socket._roomName);
                        accountSessionSocketMap[matchedAccountId].socket.join(socket._roomName);
                        let isA = true;
                        socket.emit('account matched', {
                            session : accountSessionSocketMap[socket._userName].session,
                            questionSet : questionRouter.getQuestionSet(accountSessionSocketMap[socket._userName].questionSetId, isA)
                        });
                        accountSessionSocketMap[matchedAccountId].socket.emit('account matched', {
                            session : accountSessionSocketMap[socket._userName].session,
                            questionSet : questionRouter.getQuestionSet(accountSessionSocketMap[socket._userName].questionSetId, !isA)
                        });
                    } else {
                        // no one is in queue, put current account into queue
                        accountQueue.push(socket._userName);
                        socket.emit('account in queue', {});
                    }
                }
            } else {
                // no one is in queue, put current account into queue
                accountQueue.push(socket._userName);
                socket.emit('account in queue', {});
            }
        });

        socket.on('disconnect', function() {
            if (accountSessionSocketMap[socket._userName] && (accountSessionSocketMap[socket._userName].isConnect || accountSessionSocketMap[socket._userName].session._id)) {
                sessionRouter.addOrUpdateSession(accountSessionSocketMap[socket._userName].session);
            }
            let isGiveUp = false;
            if (accountSessionSocketMap[socket._userName] && accountSessionSocketMap[socket._userName].isConnect) {
                if (accountSessionSocketMap[socket._userName].session.accountAId == socket._userName) {
                    // mark other connected socket as disconnected to avoid duplicate saving operations
                    accountSessionSocketMap[accountSessionSocketMap[socket._userName].session.accountBId].isConnect = false;
                    // requeue other account
                    accountQueue.push(accountSessionSocketMap[socket._userName].session.accountBId);
                } else {
                    accountSessionSocketMap[accountSessionSocketMap[socket._userName].session.accountAId].isConnect = false;
                    accountQueue.push(accountSessionSocketMap[socket._userName].session.accountAId);
                }
                isGiveUp = !!accountSessionSocketMap[socket._userName].session.currentGiveUpNumber;
            }
            var index = accountQueue.indexOf(socket._userName);
            if (index > -1) {
                accountQueue.splice(index, 1);
            }
            accountSessionSocketMap[socket._userName].currentWaitingCheckAttempt.attempt = undefined;
            delete accountSessionSocketMap[socket._userName];
            if (socket._roomName) {
                let message = isGiveUp ? 'give up leaving' : 'leave';
                socket.to(socket._roomName).emit(message, socket._userName);
            }
        });

        socket.on('giveUpSession', function() {
            if (accountSessionSocketMap[socket._userName] && !accountSessionSocketMap[socket._userName].session.currentGiveUpNumber) {
                sessionRouter.getSessionCurrentGiveUpNumber(accountSessionSocketMap[socket._userName].session).then(function(num) {
                    accountSessionSocketMap[socket._userName].session.currentGiveUpNumber = num;
                    accountSessionSocketMap[socket._userName].currentWaitingCheckAttempt.attempt = undefined;
                    socket.emit('give up completed', {});
                });
            }
        });

        socket.on('new message', function(data){
            if (socket._userName == "invalid_socket") {
                socket.emit('account already has socket', {});
                return;
            }
            let message = { accountId : socket._userName, message : data, createdDate : new Date() };
            accountSessionSocketMap[socket._userName].session.messages.push(message);
            io.in(socket._roomName).emit('new message', message);
        });

        socket.on('clear check attempt', function(data){
            accountSessionSocketMap[socket._userName].currentWaitingCheckAttempt.attempt = undefined;
            let message = { accountId : 'Admin', message : 'Your collaborator canceled the check answer attempt', createdDate : new Date() };
            socket.to(socket._roomName).emit('new message', message);
        });

        socket.on('new check attempt', function(data) {
            if (socket._userName == "invalid_socket") {
                socket.emit('account already has socket', {});
                return;
            }
            if (!accountSessionSocketMap[socket._userName].currentWaitingCheckAttempt.attempt) {
                accountSessionSocketMap[socket._userName].currentWaitingCheckAttempt.attempt = data;
                let message = { accountId : 'Admin', message : 'Your collaborator requested to check answer at question #' + data.question, createdDate : new Date() };
                socket.to(socket._roomName).emit('new message', message);
            } else if (accountSessionSocketMap[socket._userName].currentWaitingCheckAttempt.attempt.question != data.question) {
                socket.emit('unmatched check answer', accountSessionSocketMap[socket._userName].currentWaitingCheckAttempt.attempt.question);
            } else {
                socket.to(socket._roomName).emit('check answer', { question: data.question, answer: data.answer });
                socket.emit('check answer', { question: data.question, answer: accountSessionSocketMap[socket._userName].currentWaitingCheckAttempt.attempt.answer });
                accountSessionSocketMap[socket._userName].currentWaitingCheckAttempt.attempt = undefined;
            }
        });
        socket.on('pingServer', function(data) {
            console.log(`Receiving ping from ${data}`);
        });
    });
    console.log('socket.io set up completed');
};

module.exports = utils;
