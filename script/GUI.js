/**
 * Static methods to show GUI elements
 */
class GUI {
    /**
     * Display a simple toast message that vanishes after a short time
     *
     * @param {string} msg Text of the message
     * @param {string} className Additional class for the message
     */
    static toast(msg, className) {
        const div = document.createElement('div');
        div.className = 'encryptedpasswords-toast ' + className;
        div.innerText = msg;
        document.body.appendChild(div);

        window.setTimeout(function () {
            document.body.removeChild(div);
        }, 3500);
    }

    //ahmet: Read the saved password settings for the current page.
    static getSavedPassword() {
        let cookie;
        const prefix = 'encryptedpasswords=';

        for (const item of document.cookie.split(';')) {
            const value = item.trim();
            if (value.startsWith(prefix)) {
                cookie = value.substring(prefix.length);
                break;
            }
        }

        if (!cookie) return { savePassword: false };

        try {
            const data = JSON.parse(decodeURIComponent(cookie));
            const entry = data && data[JSINFO.id];
            if (!entry || typeof entry !== 'object') return { savePassword: false };
            return {
                savePassword: entry.savePassword === true,
                ...(typeof entry.password === 'string' ? { password: entry.password } : {})
            };
        } catch (e) {
            console.warn('Could not read saved encryptedpasswords cookie:', e);
            return { savePassword: false };
        }
    }

    //ahmet: Save or remove the password settings for the current page.
    static setSavedPassword(savePassword, password = '') {
        let data = {};
        const prefix = 'encryptedpasswords=';

        for (const item of document.cookie.split(';')) {
            const value = item.trim();
            if (value.startsWith(prefix)) {
                try {
                    data = JSON.parse(decodeURIComponent(value.substring(prefix.length))) || {};
                } catch (e) {
                    data = {};
                }
                break;
            }
        }

        if (savePassword && password !== '') {
            data[JSINFO.id] = {
                savePassword: true,
                password: password
            };
        } else {
            data[JSINFO.id] = {
                savePassword: false
            };
        }

        //ahmet: Use Secure on HTTPS and restrict cross-site cookie transmission.
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = prefix + encodeURIComponent(JSON.stringify(data)) +
            '; Path=/; Max-Age=31536000; SameSite=Strict' + secure;
    }

    /**
     * A jQuery UI replacement for prompt, but using a password field
     *
     * @param {string} msg
     * @param {string} title
     * @param {boolean} repeat
     * @return {Promise<string>}
     */
    static async prompt(msg, title = '', repeat = false) {
        return new Promise(function (resolve, reject) {
            //ahmet: Load a previously saved password for this page.
            const saved = GUI.getSavedPassword();

            const repeatField = repeat ?
                `<p>${LANG.plugins.encryptedpasswords.repeatKey}</p>` +
                '<input name="repeat" type="password">' :
                '';

            let $dialog = jQuery('<div class="encryptedpasswords-prompt">' +
                `<p>${msg}</p>` +
                '<input name="pass" type="password">' +
                repeatField +
                //ahmet: Add an option for remembering the password.
                '<p><label><input name="savePassword" type="checkbox" style="width:auto"> Save password</label></p>' +
                '</div>'
            );

            //ahmet: Restore the saved checkbox state and password.
            $dialog.find("input[name='pass'], input[name='repeat']").val(saved.password || '');
            $dialog.find("input[name='savePassword']").prop('checked', saved.savePassword);

            //ahmet: Track cancellation so clicking No does not save the password.
            let cancelled = false;

            //ahmet: Remove the stored password immediately when Save password is unchecked.
            $dialog.find("input[name='savePassword']").on('change', function () {
                if (!this.checked) {
                    GUI.setSavedPassword(false);
                }
            });

            $dialog.dialog({
                modal: true,
                title: title,
                closeOnEscape: true,
                closeText: LANG.plugins.encryptedpasswords.btn_no,
                beforeClose: function (event, ui) {
                    console.log(event);
                    const pass = $dialog.find("input[name='pass']").val();
                    if (repeat && pass !== $dialog.find("input[name='repeat']").val()) {
                        $dialog.prepend(`<p class="error">${LANG.plugins.encryptedpasswords.repeatError}</p>`);
                        return false;
                    }
                },
                close: function () {
                    //ahmet: Save the password when requested before resolving the prompt.
                    const pass = $dialog.find("input[name='pass']").val();
                    const savePassword = $dialog.find("input[name='savePassword']").prop('checked');

                    if (!cancelled && pass!==saved) {
                        GUI.setSavedPassword(savePassword, pass);
                    }

                    //ahmet: Return an empty password when the dialog was cancelled.
                    resolve(cancelled ? '' : pass);
                    jQuery(this).dialog('destroy');
                },
                buttons: {
                    [LANG.plugins.encryptedpasswords.btn_ok]: function () {
                        jQuery(this).dialog('close');
                    },
                    [LANG.plugins.encryptedpasswords.btn_no]: function () {
                        //ahmet: Mark explicit cancellation so the entered password is not saved.
                        cancelled = true;
                        $dialog.find("input[name='pass']").val('');
                        $dialog.find("input[name='repeat']").val('');
                        jQuery(this).dialog('close');
                    }
                }
            });
        });
    }
}