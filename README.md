# nci mail notification

Mail notification plugin for [nci](https://github.com/node-ci/nci).

## Installation

```sh
npm install nci-mail-notification
```

## Usage

To enable add this plugin to the `plugins` section at server config, set
parameters for e-mail account at `notify.mail` e.g. for gmail:

```json
{
    "plugins": [
        "nci-mail-notification"
    ],
    "notify": {
        "mail": {
            "host": "smtp.gmail.com",
            "port": 587,
            "auth": {
                "user": "bot.nci@gmail.com",
                "pass": "pass"
            }
        }
    }
....
}
```

after that you can set mail notification at project config e.g.

```json
    "notify": {
        "on": [
            "change"
        ],
        "to": {
            "mail": {
                "sender": "someone@gmail.com",
                "recipients": ["somemail@gmail.com"]
            }
        }
    },
```