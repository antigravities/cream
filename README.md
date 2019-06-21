# cream
This is the code behind [SteamSal.es](https://steamsal.es).

Entries are collected by multiple distributed volunteers running a user-script, then submitted to a central API server. Submissions require two entries to confirm and show on-site.

## server
In order to use the Cream client, you'll need a working API server. Theoretically you could build this yourself using `viewclient`/`submitter` as a reference, but I'd recommend you just use the current server we have.

```
cd server
npm i
node index.js
```

## viewclient
The viewclient is served automagically by the server, but you may want to offload the static HTML and JS to something like S3 behind CloudFront to improve performance. It'd be a good idea to babelify `viewclient.js` before uploading, especially if you're planning on serving the site on a production level.

## submitter
The submitter is technically universal and can be used with any Cream-compatible API server.

### Installing userscript
You'll need a userscript manager, like [Tampermonkey](http://tampermonkey.net/) or [Greasemonkey](https://www.greasespot.net/) to start. Then, [click here](https://github.com/antigravities/cream/raw/master/client/submitter/submit.user.js) to download and install it.

### Setting up the submitter
Go to any Steam search page, [like this one](https://store.steampowered.com/search/?term=unending+galaxy). You'll be prompted to enter an API URL. Enter the publicly-accessible URL for your instance, without an ending slash. Then you'll be prompted for an API key. You can add your own by manually modifying the `users` table; there's no interface for this.

### Submitting apps and prices
Click the new blue `submit to [your app's domain]` button in the right panel. **Make sure you have no more than 25 search results on the page.** This will submit the prices and other app metadata to your Cream server.

## License
```
cream - decentralized collection and innovative display of Steam game discounts and metadata
Copyright (C) 2018-2019 Cutie Café.
Copyright (C) 2018-2019 /r/Steam and contributors.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
```
