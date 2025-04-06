import logger from './Logger.js';
import fs from 'fs';
import path from 'path';
import ejs from 'ejs';

export default class ApplicationController {
  static beforeActions = [];
  static afterActions = [];

  constructor(req, res) {
    // Store original request/response/params
    this._req = req;
    this._res = res;
    this._params = { ...req.params, ...req.query, ...req.body };
    this._logger = logger;
    this._actionName = null;
    this._viewLocals = {}; // Object to hold variables for the view

    // Proxy to track assignments for the view
    return new Proxy(this, {
      set: (target, prop, value) => {
        // Store the value for the view
        target._viewLocals[prop] = value;
        // Perform the actual assignment on the target object
        target[prop] = value;
        return true;
      },
      get: (target, prop) => {
        // Prioritize internal properties, constructor, and methods
        if (prop === 'constructor') {
          return target.constructor;
        }
        if (['_req', '_res', '_params', '_logger', '_actionName', '_viewLocals'].includes(prop)) {
           return Reflect.get(target, prop);
        }
        if (typeof target[prop] === 'function') {
          return Reflect.get(target, prop);
        }
        
        // Then check if the property exists in viewLocals (set via this.prop = value)
        if (prop in target._viewLocals) {
          return target._viewLocals[prop];
        }

        // Fallback to other properties on the target
        return Reflect.get(target, prop);
      }
    });
  }

  // Accessors required because proxy intercepts direct access
  // Although the refined get trap might make these less critical, keeping for clarity
  get req() { return this._req; }
  get res() { return this._res; }
  get params() { return this._params; }
  get logger() { return this._logger; }
  get actionName() { return this._actionName; }
  set actionName(value) { this._actionName = value; }

  async processAction(action) {
    this.actionName = action; // Use the setter
    // Determine format (this is a simple guess, could be more robust)
    const format = this.req.headers.accept?.includes('application/json') ? 'JSON' : 'HTML';
    const actionTimerLabel = this.logger.startAction(this.constructor.name, action, format);
    
    try {
      // Execute before actions
      await this.runCallbacks('before');
      
      // Execute the action, passing the combined parameters
      if (typeof this[action] !== 'function') {
        throw new Error(`Action '${action}' not found in ${this.constructor.name}`);
      }
      
      const actionResult = await this[action](this._params);
      
      // Execute after actions
      await this.runCallbacks('after');
      
      // Handle response: respect action result first, then implicit render
      if (!this.res.headersSent) {
        if (actionResult !== undefined) {
          // Action returned something, assume it's data to be sent as JSON
          // If it has a status property, use it
          const status = actionResult.status || 200;
          this.logger.debug(`Action ${this.constructor.name}#${action} returned a result, sending JSON response with status ${status}.`);
          this.res.status(status).json(actionResult);
        } else {
          // Action returned undefined, attempt implicit render
          this.logger.debug(`No explicit response sent or value returned from ${this.constructor.name}#${action}, attempting implicit render.`);
          await this.render(action);
        }
      }
      
      this.logger.endAction(this.constructor.name, action);
      return actionResult; // Return the original result (might be undefined)
    } catch (error) {
      this.logger.error(`Error in ${this.constructor.name}#${action}: ${error.message}`);
      // End action timer even on error
      this.logger.endAction(this.constructor.name, action, true);
      throw error;
    }
  }

  async runCallbacks(type) {
    const callbacks = type === 'before' 
      ? this.constructor.beforeActions 
      : this.constructor.afterActions;
    
    for (const callback of callbacks) {
      let shouldRun = true;
      
      // Check if the callback should run for the current action
      if (callback.only && !callback.only.includes(this.actionName)) {
        shouldRun = false;
      }
      
      if (callback.except && callback.except.includes(this.actionName)) {
        shouldRun = false;
      }
      
      if (shouldRun) {
        this.logger.debug(`Running ${type} callback '${callback.method}' for ${this.constructor.name}#${this.actionName}`);
        const timer = this.logger.startTimer(`callback-${type}-${callback.method}`);
        
        try {
          await this[callback.method]();
          this.logger.logTimingEnd(timer, `${type} callback '${callback.method}'`);
        } catch (error) {
          this.logger.error(`Error in ${type} callback '${callback.method}': ${error.message}`);
          throw error;
        }
      }
    }
  }

  // Render HTML using template
  async render(view, locals = {}, layout = 'application') {
    const viewDir = path.resolve(process.cwd(), 'app/views');
    const controllerName = this.constructor.name.replace('Controller', '').toLowerCase();
    const viewRelativePath = path.join(controllerName, `${view}.ejs`);
    const viewFullPath = path.join(viewDir, viewRelativePath);
    const layoutRelativePath = path.join('layouts', `${layout}.ejs`);
    const layoutFullPath = path.join(viewDir, layoutRelativePath);

    if (!fs.existsSync(viewFullPath)) {
      this.logger.error(`View not found: ${viewFullPath}`);
      throw new Error(`View not found: ${controllerName}/${view}`);
    }
    if (!fs.existsSync(layoutFullPath)) {
        this.logger.error(`Layout not found: ${layoutFullPath}`);
        throw new Error(`Layout not found: layouts/${layout}`);
    }

    this.logger.debug(`Rendering view: ${controllerName}/${view} with layout: ${layout} using EJS`);
    const renderTimer = this.logger.startTimer(`render-${controllerName}-${view}-with-${layout}-ejs`);

    try {
      const mergedLocals = { ...this._viewLocals, ...locals };

      const viewContent = await ejs.renderFile(viewFullPath, mergedLocals, { async: true });

      const layoutLocals = { ...mergedLocals, body: viewContent };
      const fullHtml = await ejs.renderFile(layoutFullPath, layoutLocals, { async: true });

      // Use the modified logTimingEnd which now includes duration
      this.logger.logTimingEnd(renderTimer, `Rendered ${viewRelativePath} with layout ${layoutRelativePath}`);
      this.res.send(fullHtml);
    } catch (error) {
      this.logger.error(`Error rendering ${controllerName}/${view} with layout ${layout} using EJS: ${error.message}`);
      this.logger.error(error.stack);
      this.logger.warn("Locals passed to EJS:", { ...this._viewLocals, ...locals });
      // Pass true for isError
      this.logger.logTimingEnd(renderTimer, `Failed to render ${viewRelativePath} with layout ${layoutRelativePath}`, true);
      throw error;
    }
  }

  // Redirect to another path
  redirect(path) {
    this.logger.debug(`Redirecting to: ${path}`);
    this.res.redirect(path);
  }

  // Send JSON response
  json(data) {
    this.logger.debug(`Sending JSON response: ${JSON.stringify(data).substring(0, 100)}...`);
    this.res.json(data);
  }

  // Static methods for declaring controller callbacks
  static beforeAction(method, options = {}) {
    this.beforeActions.push({ method, ...options });
  }

  static afterAction(method, options = {}) {
    this.afterActions.push({ method, ...options });
  }
}