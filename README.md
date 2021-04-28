# z3.is
A simple NodeJS app to host my site [z3.is](z3.is).

![](https://i.gyazo.com/96bb9137a6b9832036eca2e4cc38e458.png)

![](https://i.gyazo.com/244d4cb045c8f3f6fbad8af34a3f3740.png)

## Features
* Pastebin
* Syntax Highlighting
* URL Shortener
* File upload storage

## Setup
1. Clone the repository, then run `npm install`
2. Run the app once using `node index.js`
3. Generate a bcrypt password with a website like this like [this](https://gchq.github.io/CyberChef/#recipe=Bcrypt(12)&input=eW91cl9wYXNzd29yZA) to generate a bcrypt password for the admin dashboard.
4. Add an entry to `db.json` for your username. Example:
```json
    "users": [
        {
            "user": "ADMIN_USER",
            "pass": "BCRYPT_PASS"
        }
    ],
```
5. Run the app again with `node index.js`, and you should now be able to navigate to `/admin/` and login.

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](https://choosealicense.com/licenses/mit/)