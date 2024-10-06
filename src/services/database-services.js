const { Channels, Youtube, Facebook } = require('../../models');

const getChannelInfo = async (payload) => {
  return await Channels.findOne({ where: payload });
};

const createChannelInfo = async (payload) => {
  return await Channels.create(payload);
};

const updateChannelInfo = async (channel, payload) => {
  return await channel.update(payload);
};

const getYoutubeInfo = async (payload) => {
  return await Youtube.findOne({ where: payload });
};

const createYoutubeInfo = async (payload) => {
  return await Youtube.create(payload);
};

const updateYoutubeInfo = async (youtube, payload) => {
  return await youtube.update(payload);
};

const getFacebookInfo = async (payload) => {
  return await Facebook.findOne({ where: payload });
};

const createFacebookInfo = async (payload) => {
  return await Facebook.create(payload);
};

const updateFacebookInfo = async (facebook, payload) => {
  return await facebook.update(payload);
};

module.exports = { getChannelInfo, getYoutubeInfo, createChannelInfo, createYoutubeInfo, updateYoutubeInfo, getFacebookInfo, createFacebookInfo, updateFacebookInfo, updateChannelInfo };
