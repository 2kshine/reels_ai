'use strict';
const {
  Model
} = require('sequelize');
const { v4: uuidv4 } = require('uuid'); // Import the UUID generator

module.exports = (sequelize, DataTypes) => {
  class Tiktok extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate (models) {
      // define association here
      Tiktok.hasOne(models.Channels, {
        foreignKey: 'tiktok_uid',
        as: 'channels'
      });
    }
  }
  Tiktok.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    open_id: {
      type: DataTypes.STRING
    },
    name: {
      type: DataTypes.STRING
    },
    email: {
      type: DataTypes.STRING
    },
    refresh_token: {
      type: DataTypes.STRING
    }
  }, {
    sequelize,
    modelName: 'Tiktok',
    hooks: {
      beforeCreate: (channel, options) => {
        channel.id = uuidv4(); // Generate a UUID before creating the record
      }
    }
  });
  return Tiktok;
};
