// Import all built-in node modules and methods, as well as installed modules 
const http = require('http');
const fs = require('fs');
const finalHandler = require('finalHandler');
const Router = require('router');
const queryString = require('querystring');
const bodyParser   = require('body-parser');
const uid = require('rand-token').uid;
const url = require('url');

// DO NOT INTEND TO USE, WILL DELETE WHEN READY TO SUBMIT
// const Brand = require('../models/brand')
// const Product = require('../models/product')

// State holding variables 
let brands = [];
let products = [];
let users = [];
let accessTokens = [];
let cart = [];

// Establish port 
const PORT = 3001;

const TOKEN_VALIDITY_TIMEOUT = 15 * 60 * 1000;

// Set up router 
const myRouter = Router()
myRouter.use(bodyParser.json())

// Establish server with finalHandler 
const server = http.createServer((request, res) => {
  res.writeHead(200);
  myRouter(request, res, finalHandler(request, res));
});
server.listen(PORT, (error) => {
  if (error) {
    return console.log('Error on Server Startup: ', error)
  } 

fs.readFile('app/brands.json', 'utf8', function (error, data) {
  if (error) throw error;
  brands = JSON.parse(data);
  console.log(`Server setup: ${brands.length} brands loaded`);
});
fs.readFile('app/products.json', 'utf8', function (error, data) {
  if (error) throw error;
  products = JSON.parse(data);
  console.log(`Server setup: ${products.length} products loaded`);
});
fs.readFile('app/users.json', 'utf8', function (error, data) {
  if (error) throw error;
  users = JSON.parse(data);
  console.log(`Server setup: ${users.length} users loaded`);
});
console.log(`Server is listening on ${PORT}`);
});

// GET all brands
myRouter.get('/v1/brands', (request, response) => {
  if(!brands) {
    response.writeHead(404, 'There are no brands to return');
    return response.end();
  } else {
    response.writeHead(200, { 'Content-Type': 'application/json'});
    return response.end(JSON.stringify(brands));
  }
});

// GET all products
myRouter.get('/v1/products', (request, response) => {
  if(!products) {
    response.writeHead(404, 'There are no products to return');
    return response.end();
  } else {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    return response.end(JSON.stringify(products));
  }
});

// GET products by brand id
myRouter.get('/v1/brands/:id/products', (request, response) => {
  const { id } = request.params;
  const brand = brands.find(brand =>brand.id == id);
  const productsByBrand = products.filter(product => product.categoryId == id);
    
  if (!brand) {
    response.writeHead(404, 'No results were found');
    return response.end();
  } else if (!productsByBrand) {
    response.writeHead(404, 'No results were found');
    return response.end();
  } else {
    response.writeHead(200, { 'Content-Type': 'application/json'});
    return response.end(JSON.stringify(productsByBrand));
  }
});

// POST user login
myRouter.post("/v1/login", (request, response) => {
	const login = queryString.parse(request._parsedUrl.query)

  if(login.username && login.password) {
    
    // if username and password being used match a registered user, user is userObject including username, password and accessToken
    let user = users.find((user) => {
      return user.login.username === login.username && user.login.password === login.password;
    })

    if(user) {
      
      response.writeHead(200, Object.assign({ 'Content-Type': 'application/json'}));

      let currentAccessToken = accessTokens.find((tokenObject) => {
        return tokenObject.username == user.login.username;
      });

      if (currentAccessToken) {
        currentAccessToken.lastUpdated = new Date();
        console.log('current acc token', currentAccessToken)
        return response.end(JSON.stringify(currentAccessToken.token));
      } else {
        let newAccessToken = {
          username: user.login.username,
          lastUpdated: new Date(),
          token: uid(16)
        }
        accessTokens.push(newAccessToken);
        console.log('see if new added', accessTokens)
        console.log('new access token', newAccessToken)
        return response.end(JSON.stringify(newAccessToken.token));
      }
    } else {
      response.writeHead(401, 'Invalid username or password');
      return response.end();
    }
  } else {
    response.writeHead(400, 'Incorrectly formatted response');
    return response.end();
  }
});

// // GET current user's cart = CAN ACCESS WITH JUST ACCESS TOKEN
myRouter.get('/v1/me/cart', (request, response) => {
  let currentAccessToken = getValidTokenFromRequest(request);
  
 
  if(!currentAccessToken) {
    response.writeHead(401, 'You must be logged in to access your cart');
    return response.end();
  }
  
 let user = users.find((user) => {
    return user.login.username == currentAccessToken.username
    });
    response.writeHead(200, { 'Content-Type': 'application/json'});
    return response.end(JSON.stringify(user.cart));
  });
 
  myRouter.post('/v1/me/cart/:id', (request, response) => {
    console.log('request', request);
    let currentAccessToken = getValidTokenFromRequest(request);
  
    if(!currentAccessToken) {
      response.writeHead(401, 'You must be logged in to access your cart');
      return response.end();
    }
    console.log('id', request.params.id);
    const { id } = request.params;
    const desiredProduct = products.find((products) => {
      return products.id == id;
    });
    console.log(desiredProduct)
  
    if(!desiredProduct){
      response.writeHead(404, 'No results were found');
      return response.end();
    } else {
      response.writeHead(200, { 'Content-Type': 'application/json'});
      cart.push(desiredProduct);
      console.log(cart)
      return response.end(JSON.stringify(desiredProduct));
    }
  });

  var getValidTokenFromRequest = function(request) {
  var parsedUrl = require('url').parse(request.url,true)
  if (parsedUrl.query.accessToken) {
    // Verify the access token to make sure its valid and not expired
    let currentAccessToken = accessTokens.find((accessToken) => {
     return accessToken.token == parsedUrl.query.accessToken && ((new Date) - accessToken.lastUpdated) < TOKEN_VALIDITY_TIMEOUT;
    });
    if (currentAccessToken) {
      return currentAccessToken;
    } else {
      return null;
    }
  } else {
    return null;
  }
};

module.exports = server;