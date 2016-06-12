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

        return readFile(zipFilePath, 'binary')
            .then(function (zipData) {
                options.zipFile = new Buffer(zipData, 'binary');
                return post(serviceAddress + '/viewer/widgets',
                    {
                        body: options.zipFile,
                        headers: {
                            'Content-Type': 'application/zip',
                            'Authorization': 'Bearer ' + token
                        }
                    });
            })
            .then(function (response) {
                if (response.statusCode === 409) {
                    if (!replaceIfExists) {
                        throw new Error('To replace existing widget, set replaceIfExists option to \'true\'');
                    }
                    console.log('Post upload conflict, trying to update existing widget...');
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
            .then(function (response) {
                switch (response.statusCode) {
                    case 200:
                    case 201:
                        console.log('Upload success!');
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
