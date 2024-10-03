'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Tiktok extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate (models) {
      // define association here
    }
  }
  Tiktok.init({
    firstname: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Tiktok'
  });
  return Tiktok;
};
