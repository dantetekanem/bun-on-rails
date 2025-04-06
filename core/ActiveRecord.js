import { Sequelize, Model } from 'sequelize';
import databaseConfig from '../config/database.js';
import logger from './Logger.js';

// Determine current environment
const env = process.env.NODE_ENV || 'development';
const config = databaseConfig[env];

// Custom SQL query logger (TEMPORARILY SIMPLIFIED)
const customLogger = (sql, timing) => {
  console.log(`[SEQUELIZE LOG] SQL: ${sql}`);
};

// Create Sequelize instance with custom logging
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: config.logging ? customLogger : false,
    pool: config.pool || {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Global model registry
global.modelRegistry = global.modelRegistry || new Map();

// ActiveRecord base class that all models will inherit from
class ActiveRecord extends Model {
  static schemaLoaded = false;
  static definitionParsed = false;

  constructor(...args) {
    super(...args);
  }

  static _parseDefinitions() {
    if (this.definitionParsed) return;

    const modelName = this.name;
    if (global.modelRegistry.has(modelName)) {
        this.definitionParsed = true;
        return;
    }

    logger.debug(`Parsing definitions for ${modelName}...`);
    const modelDefinition = {
      associations: [],
      validations: {},
      callbacks: {}
    };
    
    if (this.associations) {
      if (this.associations.hasMany) {
        this.associations.hasMany.forEach(relation => {
          if (typeof relation === 'function') {
            const [target, opts = {}] = relation();
            modelDefinition.associations.push({ type: 'hasMany', target, opts });
          } else {
            modelDefinition.associations.push({ type: 'hasMany', target: relation, opts: {} });
          }
        });
        logger.debug(`Parsed hasMany for ${modelName}`);
      }
      if (this.associations.belongsTo) {
         this.associations.belongsTo.forEach(relation => {
            if (typeof relation === 'function') {
                const [target, opts = {}] = relation();
                modelDefinition.associations.push({ type: 'belongsTo', target, opts });
            } else {
                modelDefinition.associations.push({ type: 'belongsTo', target: relation, opts: {} });
            }
        });
        logger.debug(`Parsed belongsTo for ${modelName}`);
      }
    }
    
    if (this.validations) {
      Object.entries(this.validations).forEach(([field, options]) => {
        const rules = {};
        if (options.presence === true) rules.presence = true;
        if (options.in) { 
            const rangeString = options.in.toString();
            if (rangeString.includes('..')) {
                 const range = rangeString.split('..').map(n => parseInt(n.trim()));
                 rules.length = range;
            } else {
                rules.length = parseInt(rangeString); 
            }
        } else if (options.length && typeof options.length === 'object' && options.length.in) {
             const rangeString = options.length.in.toString();
             if (rangeString.includes('..')) {
                const range = rangeString.split('..').map(n => parseInt(n.trim()));
                rules.length = range;
             } else {
                 rules.length = parseInt(rangeString);
             }
        }
        modelDefinition.validations[field] = rules;
      });
      logger.debug(`Parsed validate for ${modelName}`);
    }
    
    if (this.callbacks) {
        Object.entries(this.callbacks).forEach(([hookName, definitions]) => {
            definitions.forEach(definition => {
                 let method, options = {};
                 if (Array.isArray(definition)) {
                    [method, options] = definition;
                 } else {
                    method = definition;
                 }

                 if (hookName === 'afterCommit') {
                     let event = 'Create';
                     if (options.on) event = options.on.charAt(0).toUpperCase() + options.on.slice(1);
                     modelDefinition.callbacks['after' + event + 'Commit'] = method;
                 } else {
                     modelDefinition.callbacks[hookName] = method;
                 }
            });
        });
        logger.debug(`Parsed callbacks for ${modelName}`);
    }

    global.modelRegistry.set(modelName, modelDefinition);
    this.definitionParsed = true;
    logger.info(`Definitions parsed and stored for ${modelName}`);
  }

  static async initModel() {
    if (this.schemaLoaded) return;
    if (!this.definitionParsed) {
       logger.warn(`Definitions not parsed for ${this.name} before initModel called. Parsing now.`);
       this._parseDefinitions();
    }

    const modelName = this.name;
    const modelDefinition = global.modelRegistry.get(modelName);
    if (!modelDefinition) {
       throw new Error(`Model definition for ${modelName} not found in registry during initModel.`);
    }
    
    const tableName = modelName.toLowerCase() + 's';
    logger.info(`Initializing model ${modelName} with table ${tableName}`);
    
    try {
      const queryTimer = logger.startTimer(`schema-introspection-${tableName}`);
      const [columns] = await sequelize.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}';`);
      logger.logTimingEnd(queryTimer, `Schema introspection for ${tableName}`);
      
      if (columns.length === 0) {
        throw new Error(`Table '${tableName}' does not exist or has no columns. Did you run migrations?`);
      }

      const attributes = {};
      attributes.id = {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      };
      logger.debug(`Explicitly defined 'id' column for ${modelName}`);

      columns.forEach(col => {
        if (col.column_name !== 'id') { 
          let columnType = Sequelize.STRING;
          if (col.column_name === 'created_at' || col.column_name === 'updated_at') {
            columnType = Sequelize.DATE;
          } 
          
          attributes[col.column_name] = { type: columnType }; 
          logger.debug(`Found column '${col.column_name}' for ${modelName}, inferred type: ${columnType.key}`);
        }
      });

      super.init(attributes, {
        sequelize,
        modelName: modelName,
        tableName: tableName,
        underscored: true,
        timestamps: true,
        hooks: this._buildHooks(modelDefinition.callbacks),
        validate: this._buildValidators(modelDefinition.validations),
      });

      this.schemaLoaded = true;
      logger.info(`Model ${modelName} initialized successfully`);
    } catch (error) {
      logger.error(`Failed to initialize model ${modelName}: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }

  static setupAssociations() {
    const modelName = this.name;
    const modelDefinition = global.modelRegistry.get(modelName);
    
    if (!modelDefinition || !modelDefinition.associations) {
      logger.debug(`No associations found or model definition missing for ${modelName} in registry.`);
      return;
    }
    
    const associations = modelDefinition.associations;

    if (associations && associations.length > 0) {
      logger.debug(`Setting up ${associations.length} associations for ${this.name}`);
    }
    
    associations.forEach(({ type, target, opts }) => {
      try {
        this[type](sequelize.models[target], opts);
        logger.debug(`Created ${type} association from ${this.name} to ${target}`);
      } catch (error) {
        logger.error(`Failed to create ${type} association from ${this.name} to ${target}: ${error.message}`);
        throw error;
      }
    });
  }

  static _buildHooks(callbacks) {
    const hooks = {};
    if (!callbacks) return hooks;
    
    Object.entries(callbacks).forEach(([event, method]) => {
      logger.debug(`Registering ${event} hook for ${this.name}.${method}`);
      hooks[event] = async (instance) => {
        const timer = logger.startTimer(`hook-${this.name}-${event}`);
        try {
          await instance[method]();
          logger.logTimingEnd(timer, `Executed ${event} hook for ${this.name}`);
        } catch (error) {
          logger.error(`Error in ${event} hook for ${this.name}: ${error.message}`);
          throw error;
        }
      };
    });
    return hooks;
  }

  static _buildValidators(validations) {
    const validators = {};
    if (!validations) return validators;
    
    Object.entries(validations).forEach(([attr, rules]) => {
      logger.debug(`Building validator for ${this.name}.${attr}`);
      validators[attr] = function () {
        if (rules.presence && !this[attr]) {
          const error = new Error(`${attr} can't be empty`);
          logger.warn(`Validation failed for ${attr}: ${error.message}`);
          throw error;
        }
        if (rules.length) {
          const [min, max] = rules.length;
          if (this[attr].length < min || this[attr].length > max) {
            const error = new Error(`${attr} length must be between ${min} and ${max}`);
            logger.warn(`Validation failed for ${attr}: ${error.message}`);
            throw error;
          }
        }
      };
    });
    return validators;
  }

  static async find(id) {
    logger.debug(`${this.name}.find(${id})`);
    try {
      const timer = logger.startTimer(`${this.name}-find-${id}`);
      const result = await this.findByPk(id);
      logger.logTimingEnd(timer);
      return result;
    } catch (error) {
      logger.error(`Error in ${this.name}.find(${id}): ${error.message}`);
      throw error;
    }
  }

  static async findBy(conditions) {
    logger.debug(`${this.name}.findBy(${JSON.stringify(conditions)})`);
    try {
      const timer = logger.startTimer(`${this.name}-findBy`);
      const result = await this.findOne({ where: conditions });
      logger.logTimingEnd(timer);
      return result;
    } catch (error) {
      logger.error(`Error in ${this.name}.findBy: ${error.message}`);
      throw error;
    }
  }

  static async all(options = {}) {
    const modelName = this.name;
    const timerLabel = `Operation-${modelName}-all`;
    logger.startTimer(timerLabel);
    logger.info(`Starting ${modelName}.all()`);
    try {
      // Call the underlying Sequelize findAll
      const results = await this.findAll(options);
      // End the timer once
      const duration = logger.endTimer(timerLabel);
      // Log completion directly using logger.info
      logger.info(`Completed ${modelName}.all() in ${duration}ms`); // Use info, ensure meta isn't skipped if count is useful
      return results;
    } catch (error) {
      // End the timer once, even on error
      const duration = logger.endTimer(timerLabel);
      // Log error directly
      logger.error(`Error during ${modelName}.all() after ${duration}ms: ${error.message}`, { stack: error.stack });
      throw error; // Re-throw the error
    }
  }

  static async where(conditions) {
    logger.debug(`${this.name}.where(${JSON.stringify(conditions)})`);
    try {
      const timer = logger.startTimer(`${this.name}-where`);
      const result = await this.findAll({ where: conditions });
      logger.logTimingEnd(timer);
      return result;
    } catch (error) {
      logger.error(`Error in ${this.name}.where(): ${error.message}`);
      throw error;
    }
  }
}

export { ActiveRecord };
export default ActiveRecord;