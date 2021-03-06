(function () {
    'use strict';

    var Promise = require('bluebird').Promise;
    var request = require('request');
    var fs = require('fs');
    var put = Promise.promisify(request.put);
    var post = Promise.promisify(request.post);
    var readFile = Promise.promisify(fs.readFile);

    module.exports = function (settings) {
        var token = settings.token;
        var serviceAddress = settings.serviceAddress;
        var zipFilePath = settings.zipFilePath;
        var replaceIfExists = settings.replaceIfExists;
        var options = {};

        return readFile(zipFilePath)
            .then(function uploadWidget(zipFile) {
                options.zipFile = zipFile;
                return post(serviceAddress + '/viewer/widgets',
                    {
                        body: options.zipFile,
                        headers: {
                            'Content-Type': 'application/zip',
                            'Authorization': 'Bearer ' + token
                        }
                    });
            })
            .then(function reuploadWidget(response) {
                if (response.statusCode === 409) {
                    if (!replaceIfExists) {
                        return Promise.reject(new Error('To replace existing widget,' +
                            ' set replaceIfExists option to \'true\''));
                    }
                    return put(serviceAddress + '/viewer/widgets',
                        {
                            body: options.zipFile,
                            headers: {
                                'Content-Type': 'application/zip',
                                'Authorization': 'Bearer ' + token
                            }
                        });
                } else {
                    return Promise.resolve(response);
                }
            })
            .then(function postProcessing(response) {
                switch (response.statusCode) {
                    case 200:
                    case 201:
                        options.urn = JSON.parse(response.body).urn;
                        return Promise.resolve(options.urn);
                    case 400:
                        return Promise.reject(new Error('Upload failed. Bad widget package.'));
                    default:
                        return Promise.reject(new Error('Unexpected response from backend. Please try again.'));
                }
            });
    };
})();
