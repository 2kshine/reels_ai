'use strict';
const {
  Model
} = require('sequelize');
const { v4: uuidv4 } = require('uuid'); // Import the UUID generator

module.exports = (sequelize, DataTypes) => {
  class Channels extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate (models) {
      // define association here
      // Channels.belongsTo(models.Facebook, {
      //   foreignKey: 'facebook_uid',
      //   as: 'facebook'
      // });
      Channels.belongsTo(models.Youtube, {
        foreignKey: 'youtube_uid',
        as: 'youtube'
      });
      // Channels.belongsTo(models.Tiktok, {
      //   foreignKey: 'tiktok_uid',
      //   as: 'tiktok'
      // });
      // Channels.belongsTo(models.Instagram, {
      //   foreignKey: 'instagram_uid',
      //   as: 'instagram'
      // });
    }
  }
  Channels.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING
    },
    niche: {
      type: DataTypes.STRING
    },
    email: {
      type: DataTypes.STRING
    },
    youtube_uid: {
      type: DataTypes.UUID,
      references: {
        model: 'Youtube', // Name of the target table
        key: 'id' // Assuming 'id' is the primary key in the Youtubes table
      }
    },
    instagram_uid: {
      type: DataTypes.UUID
    },
    facebook_uid: {
      type: DataTypes.UUID
    },
    tiktok_uid: {
      type: DataTypes.UUID
    }
  }, {
    sequelize,
    modelName: 'Channels',
    hooks: {
      beforeCreate: (channel, options) => {
        channel.id = uuidv4(); // Generate a UUID before creating the record
      }
    }
  });
  return Channels;
};
