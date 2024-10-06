'use strict';
const {
  Model
} = require('sequelize');
const { v4: uuidv4 } = require('uuid'); // Import the UUID generator

module.exports = (sequelize, DataTypes) => {
  class Facebook extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate (models) {
      // define association here
      Facebook.hasOne(models.Channels, {
        foreignKey: 'facebook_uid',
        as: 'channels'
      });
    }
  }
  Facebook.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING
    },
    fb_page_id: {
      type: DataTypes.STRING
    },
    email: {
      type: DataTypes.STRING
    },
    access_token: {
      type: DataTypes.STRING
    }
  }, {
    sequelize,
    modelName: 'Facebook',
    hooks: {
      beforeCreate: (channel, options) => {
        channel.id = uuidv4(); // Generate a UUID before creating the record
      }
    }
  });
  return Facebook;
};
