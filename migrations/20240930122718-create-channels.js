'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('Channels', {
      id: {
        allowNull: false,
        autoIncrement: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      name: {
        type: Sequelize.STRING
      },
      niche: {
        type: Sequelize.STRING
      },
      email: {
        type: Sequelize.STRING
      },
      youtube_uid: {
        type: Sequelize.UUID
      },
      instagram_uid: {
        type: Sequelize.UUID
      },
      facebook_uid: {
        type: Sequelize.UUID
      },
      tiktok_uid: {
        type: Sequelize.UUID
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('Channels');
  }
};
