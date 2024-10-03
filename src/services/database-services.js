const { Channels, Youtube } = require('../../models');

const getChannelInfo = async (payload) => {
  return await Channels.findOne({ where: payload });
};

const createChannelInfo = async (payload) => {
  return await Channels.create(payload);
};

const getYoutubeInfo = async (payload) => {
  return await Youtube.findOne({ where: payload });
};

const createYoutubeInfo = async (payload) => {
  return await Youtube.create(payload);
};

module.exports = { getChannelInfo, getYoutubeInfo, createChannelInfo, createYoutubeInfo };
