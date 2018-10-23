import React from 'react';
import {renderToString} from 'react-dom/server';
import {StaticRouter} from 'react-router-dom';
import express from 'express';
import {getDataFromTree, flushStore} from 'priem';
import App from './App';

const assets = require(process.env.RAZZLE_ASSETS_MANIFEST);

const server = express();
server
    .disable('x-powered-by')
    .use(express.static(process.env.RAZZLE_PUBLIC_DIR))
    .get('/*', async (req, res) => {
        const context = {};
        const tree = (
            <StaticRouter context={context} location={req.url}>
                <App />
            </StaticRouter>
        );

        await getDataFromTree(tree);
        const markup = renderToString(tree);

        const priemData = flushStore();

        if (context.url) {
            res.redirect(context.url);
        } else {
            res.status(200).send(
                `<!doctype html>
    <html lang="">
    <head>
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta charset="utf-8" />
        <title>Welcome to Razzle</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        ${assets.client.css ? `<link rel="stylesheet" href="${assets.client.css}">` : ''}
        <script>window.__PRIEM_STORE__ = '${JSON.stringify(priemData)}';</script>
        ${
            process.env.NODE_ENV === 'production'
                ? `<script src="${assets.client.js}" defer></script>`
                : `<script src="${assets.client.js}" defer crossorigin></script>`
        }
    </head>
    <body>
        <div id="root">${markup}</div>
    </body>
</html>`
            );
        }
    });

export default server;
