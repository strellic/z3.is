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
* Scopes system to create new users with certain scopes

## Setup
1. Clone the repository, then run `npm install`
2. Copy `.env.example` to `.env`, and edit it with the correct details
3. Run the app using `node index.js`
4. Navigate to `/admin` to create an account with the `superadmin` scope

## Scopes
Scopes are how certain accounts are given access to specific sections of the website.
* superadmin - access to everything
* users - access to create / delete users (this can create new superadmin accounts)
* shorten - access to the URL shortener
* paste - access to the pastebin system
* upload - access to upload files (limited by MAXFILE size in .env)
* download - access to download remote files (not limited by MAXFILE)

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](https://choosealicense.com/licenses/mit/)