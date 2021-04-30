# z3.is
A simple NodeJS app to host my site [z3.is](https://z3.is).

![](https://i.gyazo.com/003911e2642d1f57f9d9160fc6d9c842.png)

![](https://i.gyazo.com/244d4cb045c8f3f6fbad8af34a3f3740.png)

![](https://i.gyazo.com/8cbb4ee2b55b23a1af82216be758e9bd.png)

![](https://i.gyazo.com/50aec220b8595c322e27ef206a413c1c.png)

## Features
* Pastebin w/ Expiration & Burn on Read
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
* superadmin - access to everything (can make new superadmin accounts)
* users - access to create / delete users (can't create / delete superadmin accounts)
* shorten - access to the URL shortener
* paste - access to the pastebin system
* upload - access to upload files (limited by MAXFILE size in .env)
* download - access to download remote files (not limited by MAXFILE)

Superadmins can view the creations of all other users, so give people this scope with caution. People without the `superadmin` scope will only be able to see their own creations. However, people with the `users` scope can see and delete non-superadmin accounts.

## API Tokens & ShareX
[z3.is](https://z3.is) also supports [ShareX](https://getsharex.com/)'s custom uploaders for the pastebin, url shortener, and file upload functionality.

### API Routes
Using these routes without the session cookie requires an authorization header, in the following format:
```
Authorization: Bearer [API TOKEN]
```

The list of routes important for functionality are:
* POST /api/shorten
* POST /api/paste
* POST /api/upload

These routes when used with an API token will respond with the URL of the new resource exactly.

Example queries:
```bash
curl -X POST https://z3.is/api/shorten -d "url=https://google.com" -H "Authorization: Bearer API_TOKEN"
curl -X POST https://z3.is/api/paste -d "text=pastedata" -H "Authorization: Bearer API_TOKEN"
curl -X POST https://z3.is/api/upload -d "file=@test.txt" -F "Authorization: Bearer API_TOKEN"
```

Check the `sharex` folder for custom uploaders you can use directly with ShareX, just make sure to edit them to add your API token first.

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](https://choosealicense.com/licenses/mit/)