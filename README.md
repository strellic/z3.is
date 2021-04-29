# z3.is
A simple NodeJS app to host my site [z3.is](https://z3.is).

![](https://i.gyazo.com/003911e2642d1f57f9d9160fc6d9c842.png)

![](https://i.gyazo.com/244d4cb045c8f3f6fbad8af34a3f3740.png)

![](https://i.gyazo.com/8cbb4ee2b55b23a1af82216be758e9bd.png)

![](https://i.gyazo.com/50aec220b8595c322e27ef206a413c1c.png)

## Features
* Pastebin
* Pastes w/ Expiration & Burn on Read
* Syntax Highlighting
* URL Shortener
* File upload storage
* Download files from remote URLs
* Download progress percentage with WebSockets
* DB management page to view / delete everything

## Setup
1. Clone the repository, then run `npm install`
2. Copy `.env.example` to `.env`, and edit it with the correct details
3. Run the app once using `node index.js`
4. Generate a bcrypt password with a website like this like [this](https://gchq.github.io/CyberChef/#recipe=Bcrypt(12)&input=eW91cl9wYXNzd29yZA) to generate a bcrypt password for the admin dashboard
5. Add an entry to `db.json` for your username. Example:
```json
    "users": [
        {
            "user": "ADMIN_USER",
            "pass": "BCRYPT_PASS"
        }
    ],
```
6. Run the app again with `node index.js`, and you should now be able to navigate to `/admin/` and login

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](https://choosealicense.com/licenses/mit/)