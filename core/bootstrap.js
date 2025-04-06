import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import logger from './Logger.js';
import ActiveRecord from './ActiveRecord.js';
import { pathToFileURL } from 'url';

/**
 * Loads all ActiveRecord models and initializes their schemas.
 */
async function loadAllModels() {
  const modelsDir = path.join(process.cwd(), 'app/models');
  logger.info('Loading all models...');
  const modelClasses = []; // Store imported classes
  const importErrors = []; // Track import errors

  try {
    const files = fs.readdirSync(modelsDir)
      .filter(file => file.endsWith('.js'));

    // --- Pass 0: Import Classes --- 
    logger.info('--- Importing Model Classes (Pass 0) ---');
    for (const file of files) {
        const modelPath = path.resolve(modelsDir, file); // Get absolute path
        const modelFileUrl = pathToFileURL(modelPath).href; // Convert to file:// URL
        
        try {
          const { default: ModelClass } = await import(modelFileUrl);
          if (ModelClass && ModelClass.prototype instanceof ActiveRecord) { // Basic check
              logger.debug(`Imported ${ModelClass.name} from ${file}`);
              modelClasses.push(ModelClass);
          } else {
              logger.warn(`Skipping file ${file}: Does not appear to export an ActiveRecord model.`);
              importErrors.push({ file, error: 'Invalid export' });
          }
        } catch (importError) {
           logger.error(`Failed to import model from ${file}: ${importError.message}`, { stack: importError.stack });
           importErrors.push({ file, error: importError });
           // Continue importing others
        }
    }
    logger.info('--- Finished Importing Model Classes ---');
    if (importErrors.length > 0) {
        logger.error('Encountered errors during model import. Aborting bootstrap.');
        // Optionally log detailed errors
        importErrors.forEach(err => logger.error(`  - ${err.file}: ${err.error.message || err.error}`));
        throw new Error('Model import failed.');
    }

    // --- Pass 1: Parse Definitions --- 
    logger.info('--- Parsing Definitions (Pass 1) ---');
    for (const ModelClass of modelClasses) {
        if (typeof ModelClass._parseDefinitions === 'function') {
             logger.debug(`Parsing definitions for ${ModelClass.name}...`);
            ModelClass._parseDefinitions(); // This should be synchronous
        } else {
             logger.warn(`Model ${ModelClass.name} missing _parseDefinitions method.`);
        }
    }
    logger.info('--- Finished Parsing Definitions ---');

    // --- Pass 2: Initialize Models (call initModel) --- 
    logger.info('--- Initializing Models (Pass 2) ---');
    for (const ModelClass of modelClasses) {
      if (typeof ModelClass.initModel === 'function') {
        logger.debug(`Initializing ${ModelClass.name}...`);
        await ModelClass.initModel(); 
      } else {
         logger.warn(`Model ${ModelClass.name} missing initModel method.`);
      }
    }
    logger.info('--- Finished Initializing Models ---');

    // --- Pass 3: Setup Associations --- 
    logger.info('--- Setting up Associations (Pass 3) ---');
    for (const ModelClass of modelClasses) {
        if (typeof ModelClass.setupAssociations === 'function') {
            logger.debug(`Setting up associations for ${ModelClass.name}...`);
            ModelClass.setupAssociations(); 
        } else {
             logger.warn(`Model ${ModelClass.name} missing setupAssociations method.`);
        }
    }
    logger.info('--- Finished Setting up Associations ---');

    logger.info('Finished loading all models and associations.');
  } catch (error) {
     // Catch errors from initModel or association setup
     logger.error(`Error during model loading process: ${error.message}`, { stack: error.stack });
     throw error; 
  }
}

/**
 * Bootstrap the Bun-on-Rails application
 * @param {object} routes - Router instance
 * @param {object} options - Configuration options
 * @returns {object} Express app
 */
export default function bootstrap(routes, options = {}) {
  // Create Express application
  const app = express();
  const port = options.port || process.env.PORT || 3000;

  // Setup middleware
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  // Serve static files from public directory
  const publicDir = path.join(process.cwd(), 'public');
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
    logger.info(`Serving static files from ${publicDir}`);
  }

  // Add routes
  app.use(routes.getRouter());

  // 404 handler
  app.use((req, res) => {
    logger.warn(`Route not found: ${req.method} ${req.path}`);
    res.status(404).json({ error: 'Not Found' });
  });

  // Error handler
  app.use((err, req, res, next) => {
    logger.error(`Unhandled error: ${err.message}`, { 
      stack: err.stack,
      path: req.path,
      method: req.method
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  // Start function
  const start = async () => {
    // Load models before starting the server
    await loadAllModels();
    
    return new Promise((resolve) => {
      try {
        const server = app.listen(port, () => {
          logger.info(`Server running at http://localhost:${port}`);
          
          // Print routes in development
          if (process.env.NODE_ENV !== 'production') {
            routes.printRoutes();
          }
          
          resolve(server);
        });
      } catch (error) {
        logger.error(`Failed to start server: ${error.message}`, { stack: error.stack });
        throw error;
      }
    });
  };

  return {
    app,
    start
  };
} 