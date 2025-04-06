import express from 'express';
import logger from './Logger.js';
import http from 'http'; // Import http for STATUS_CODES

export default class Router {
  constructor() {
    this.router = express.Router();
    this.routes = [];
  }

  get(path, controllerAction) {
    this._addRoute('GET', path, controllerAction);
    return this;
  }

  post(path, controllerAction) {
    this._addRoute('POST', path, controllerAction);
    return this;
  }

  put(path, controllerAction) {
    this._addRoute('PUT', path, controllerAction);
    return this;
  }

  patch(path, controllerAction) {
    this._addRoute('PATCH', path, controllerAction);
    return this;
  }

  delete(path, controllerAction) {
    this._addRoute('DELETE', path, controllerAction);
    return this;
  }

  // Add a route with controller and action
  _addRoute(method, path, controllerAction) {
    const [controllerName, actionName] = controllerAction.split('#');
    
    logger.debug(`Registering route: ${method} ${path} => ${controllerName}#${actionName}`);
    
    this.routes.push({
      method,
      path,
      controller: controllerName,
      action: actionName
    });

    // Create Express route handler
    this.router[method.toLowerCase()](path, async (req, res, next) => {
      // Start overall request timer
      const requestTimerLabel = logger.startTimer(`request-${req.ip}-${Date.now()}`); 
      
      // Log initial request line
      logger.info(`Started ${req.method} "${req.originalUrl || req.url}" for ${req.ip} at ${new Date().toISOString()}`, { skipMeta: true });
      
      // Log Parameters
      const paramsToLog = { ...req.params, ...req.query, ...req.body };
      if (Object.keys(paramsToLog).length > 0) {
          logger.info(`  Parameters: ${JSON.stringify(paramsToLog)}`, { skipMeta: true });
      }
      
      // Handler for response finish
      const onFinish = () => {
          // Clean up listeners
          res.removeListener('finish', onFinish);
          res.removeListener('error', onError);
          
          const duration = logger.endTimer(requestTimerLabel);
          const status = res.statusCode;
          const statusText = http.STATUS_CODES[status] || 'Unknown Status';
          const logMethod = status >= 400 ? 'error' : 'info';
          
          logger[logMethod](`Completed ${status} ${statusText} in ${duration}ms`, { skipMeta: true });
      };

      // Handler for response error
      const onError = (err) => {
          // Clean up listeners
          res.removeListener('finish', onFinish);
          res.removeListener('error', onError);
          
          const duration = logger.endTimer(requestTimerLabel);
          logger.error(`Request failed in ${duration}ms: ${err.message}`, { skipMeta: true, stack: err.stack });
      };

      res.on('finish', onFinish);
      res.on('error', onError);

      try {
          // Dynamically import the controller
          const ControllerClass = (await import(`../app/controllers/${controllerName}.js`)).default;
          
          // Create controller instance
          const controller = new ControllerClass(req, res);
          
          // Process the action
          await controller.processAction(actionName);
          
          // If processAction completes without sending a response (e.g., no render/redirect/json call),
          // the 'finish' event might not fire until later or not at all if connection hangs.
          // This is less common in typical web flows but possible.
          // Consider adding a timeout or alternative handling if needed.
          
      } catch (error) {
          // Error during controller loading or processing
          logger.error(`Error processing ${method} ${req.originalUrl || req.url}: ${error.message}`, {
              stack: error.stack,
              skipMeta: false // Show stack trace for processing errors
          });
          
          // Ensure the error handler middleware is called
          // Check if headers are already sent before trying to send a 500 response
          if (!res.headersSent) {
              res.status(500).json({
                  error: 'Internal Server Error',
                  message: process.env.NODE_ENV === 'development' ? error.message : undefined
              });
          } else {
             // If headers are sent, we can't send a new response, rely on onError logging
             logger.warn('Headers already sent, cannot send 500 response for error.');
          }

          // Pass the error to the next error handler (defined in bootstrap.js)
          // This might be redundant if we already sent a response, but good practice.
          next(error); 
      }
    });
  }

  // Define a resource with RESTful routes
  resources(resource, options = {}) {
    const resourceSingular = resource.slice(0, -1);
    const controller = options.controller || `${capitalizeFirst(resourceSingular)}sController`;
    
    logger.info(`Setting up resource routes for '${resource}'`);

    // GET /resources - index
    if (!options.only || options.only.includes('index')) {
      this.get(`/${resource}`, `${controller}#index`);
    }
    
    // GET /resources/new - new
    if (!options.only || options.only.includes('new')) {
      this.get(`/${resource}/new`, `${controller}#new`);
    }
    
    // POST /resources - create
    if (!options.only || options.only.includes('create')) {
      this.post(`/${resource}`, `${controller}#create`);
    }
    
    // GET /resources/:id - show
    if (!options.only || options.only.includes('show')) {
      this.get(`/${resource}/:id`, `${controller}#show`);
    }
    
    // GET /resources/:id/edit - edit
    if (!options.only || options.only.includes('edit')) {
      this.get(`/${resource}/:id/edit`, `${controller}#edit`);
    }
    
    // PUT/PATCH /resources/:id - update
    if (!options.only || options.only.includes('update')) {
      this.put(`/${resource}/:id`, `${controller}#update`);
      this.patch(`/${resource}/:id`, `${controller}#update`);
    }
    
    // DELETE /resources/:id - destroy
    if (!options.only || options.only.includes('destroy')) {
      this.delete(`/${resource}/:id`, `${controller}#destroy`);
    }

    return this;
  }

  // Get the Express router
  getRouter() {
    return this.router;
  }

  // Print routes table
  printRoutes() {
    logger.info('Routes:');
    
    const routeTable = this.routes.map(route => {
      return {
        Method: route.method,
        Path: route.path,
        Controller: route.controller,
        Action: route.action
      };
    });
    
    console.table(routeTable);
  }
}

function capitalizeFirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}