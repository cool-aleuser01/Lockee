// Lockee
// Copyright (C) 2015  Hylke Bons
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.


$(document).ready(function() {
    var url = '' + window.location;
    var fileName;
    var fileContent;
         
    $('#locker-empty').on('submit', function(event) {
        disablePassphraseDialog();
        hidePassphraseDialog();

        showDoor();
        showSpinner();

        var passphrase = getPassphraseFromFieldset();
        var salt       = getSaltFromFieldset();

        var encryptLockerWorker = new Worker('/scripts/client-encrypt.js');
        
        encryptLockerWorker.addEventListener('message', function(event) {
            var err = event.data[0];

            encryptLockerWorker.terminate();
            hideSpinner();

            if (err) {
                enablePassphraseDialog();
                showPassphraseDialog();
                showErrorNotification();

            } else {
                showSuccessNotification();
            }
        });

        encryptLockerWorker.postMessage([url, passphrase, salt, fileName, fileContent]);

        fileContent = null;
        event.preventDefault();
    });


    $('#locker-in-use').on('submit', function(event) {
        disablePassphraseDialog();
        showSpinner();
        
        var passphrase = getPassphraseFromFieldset();
        var salt       = getSaltFromFieldset();

        // TODO: Use transferable objects to pass data to workers
        var decryptLockerWorker = new Worker('/scripts/client-decrypt.js');

        decryptLockerWorker.addEventListener('message', function(event) {
            var err = event.data[0];
            hideSpinner();

            if (err) {
                // TODO: Shake effect
                enablePassphraseDialog();
                return;
            }

            var fileName = event.data[1];
            var url = URL.createObjectURL(event.data[2]);

            decryptLockerWorker.terminate();

            hideDoor();
            hidePassphraseDialog();

            showDownloadLink(url, fileName);
            setTimeout(showNote, 600);

            // TODO: "Empty now" link
        });

        decryptLockerWorker.postMessage([url, passphrase, salt]);
        event.preventDefault();
    });


    var handleFileSelect = function(event) {
        hideHint();
        showSpinner();

        var file   = event.target.files[0];        
        var reader = new FileReader();

        reader.onload = function(readerEvent) {
            fileName    = file.name;
            fileContent = readerEvent.target.result;

            hideSpinner();
            showDownloadLink(null, fileName);
            showPassphraseDialog();
        };

        reader.readAsDataURL(file);
    };


    /* Interface */

    // Passphrase fieldset
    function showPassphraseDialog() {
        var showDialog = function() {
            $('#locker-empty fieldset').fadeIn(500);
            $('#locker-in-use fieldset').fadeIn(500);
            $('input[type="password"]').val('');
            putCursorAtEnd($('input[type="password"]'));
        };

        $('input[type="button"]').fadeOut(200);

        if ($('#note').length)
            $('#note').fadeOut(200, showDialog);
        else
            showDialog();
    }

    function hidePassphraseDialog() {
        $('form fieldset').fadeOut(500);
    }

    function disablePassphraseDialog() {
        $('input[type="file"]').hide();
        disableElement($('input[type="password"]'));
        disableElement($('input[type="submit"]'));
    }

    function enablePassphraseDialog() {
        $('input[type="file"]').show();
        enableElement($('input[type="password"]'));
        enableElement($('input[type="submit"]'));
    }

    $('input[type="button"]').on('click', function() {
        showPassphraseDialog();
    });

    function getPassphraseFromFieldset() {
        return $('input[type="password"]').val();
    }

    function getSaltFromFieldset() {
        return $('input[name="salt"]').val();
    }

    function getExpiresInSecondsFromFieldset() {
        return $('input[name="expires_in_seconds"]').val();
    }


    // Notifications
    function showSuccessNotification() {
        $('#message p').text('lockee.me' + window.location.pathname);
        $('#message').fadeIn().css('display', 'inline-block'); 
    }

    function showErrorNotification() {
        // TODO: Something more integrated
        alert('Something went wrong.');
    }


    // Door
    function showDoor() {
        $('#door').fadeIn(250);
    }

    function hideDoor() {
        $('#door').fadeOut(250);
    }


    // Spinner
    function showSpinner() {
        $('#spinner').fadeIn(250);
    }

    function hideSpinner() {
        $('#spinner').hide();
    }


    // Download link
    function showDownloadLink(url, fileName) {
        $('#file a').attr('href', url);
        $('#file a').attr('download', fileName);
        $('#file a').text(fileName);
        $('#file').fadeIn(250);
    }

    function hideDownloadLink() {
        $('#file').hide();
    }


    // Hint
    function hideHint() {
        $('#file').hide();
        $('#hint').hide();
    }


    // Note
    function showNote() {
        $('#note').fadeIn(200);
    }


    // Text field checks
    $('input').on('input', function() {
        if ($(this).val().length == 0)
            disableElement($(this).next());
        else
            enableElement($(this).next());
    });

    function enableElement(element) {
        element.removeAttr('disabled');
    }

    function disableElement(element) {
        element.attr('disabled', true);
    }

    function putCursorAtEnd(input) {
        input.focus();
        var text = input.val();

        if (text) {
            input.val('');
            input.val(text);
            input.select();
        }
    }


    // Go To fieldset
    $('footer button').on('click', function() {
        $('#locker-go-to fieldset').fadeToggle(500);
        putCursorAtEnd($('#locker-go-to fieldset input[type="text"]'));
    });

    $('#locker-go-to').on('submit', function(event) {
        var locker_name = $('#locker-go-to input[type="text"]').val();

        if (locker_name.length == 0)
            return false;

        if (locker_name.charAt(0) != '/')
            locker_name = '/' + locker_name;

        window.location = locker_name;
        event.preventDefault();
    });

    $(document).mouseup(function (event) {
        var container = $("#locker-go-to fieldset");

        if (!container.is(event.target) && container.has(event.target).length === 0)
            container.fadeOut(250);
    });


    // Info panel
    $('footer #tagline a').on('click', function(event) {
        $('#info-panel').fadeToggle();
        event.preventDefault();
    });

    $('#info-panel > a').on('click', function(event) {
        $('#info-panel').fadeOut();
        event.preventDefault();
    });


    // Time remaining
    function updateTimeRemaining(expires_in_seconds) {
        if (expires_in_seconds > 1)
            expires_in_seconds--;

        if (expires_in_seconds < 60) {
            if (expires_in_seconds > 1) {
                var message = '' + expires_in_seconds + ' more seconds';

            } else {
                var message = '' + expires_in_seconds + ' more second';
                clearInterval(timeRemainingTimer);
                setTimeout(function() { window.location.reload(); }, 1000);
            }

        } else if (expires_in_seconds < 120) {
            var message = '' + Math.floor(expires_in_seconds / 60) + ' more minute';

        } else if (expires_in_seconds < 7200) {
            var message = '' + Math.floor(expires_in_seconds / 60) + ' more minutes';

        } else if (expires_in_seconds < 3600 * 2) {
            var message = '' + Math.floor(expires_in_seconds / 3600) + ' more hour';

        } else {
            var message = '' + Math.floor(expires_in_seconds / 3600) + ' more hours';
        }

        $('input[name="expires_in_seconds"]').val(expires_in_seconds);
        $('#time_left').text(message);
    }

    var expiresInSeconds = getExpiresInSecondsFromFieldset();
    var timeRemainingTimer;

    if (expiresInSeconds) {
        updateTimeRemaining(expiresInSeconds);

        timeRemainingTimer = setInterval(function() {
            updateTimeRemaining(getExpiresInSecondsFromFieldset());
        }, 1000);
    }


    $('form input[type="submit"]').attr('disabled', true);


    // Browser support check
    if (window.File && window.FileReader && window.FileList && window.Blob)
        $('form input[type="file"]').bind('change', handleFileSelect);
    else
        alert('Sorry, this browser is not supported. :(');
});