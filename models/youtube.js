'use strict';
const {
  Model
} = require('sequelize');
const { v4: uuidv4 } = require('uuid'); // Import the UUID generator

module.exports = (sequelize, DataTypes) => {
  class Youtube extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate (models) {
      // define association here
      Youtube.hasOne(models.Channels, {
        foreignKey: 'youtube_uid',
        as: 'channels'
      });
    }
  }
  Youtube.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING
    },
    access_token: {
      type: DataTypes.STRING
    },
    refresh_token: {
      type: DataTypes.STRING
    },
    channel_id: {
      type: DataTypes.STRING
    }
  }, {
    sequelize,
    modelName: 'Youtube',
    hooks: {
      beforeCreate: (channel, options) => {
        channel.id = uuidv4(); // Generate a UUID before creating the record
      }
    }
  });
  return Youtube;
};
