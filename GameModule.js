const axios = require('axios');

async function getRobloxGameName(serverId) {
    try {
        const response1 = await axios.get(`https://apis.roblox.com/universes/v1/places/${serverId}/universe`);
      const universeid = response1.data.universeId;
      const response = await axios.get(`https://games.roblox.com/v1/games?universeIds=${universeid}`);
        const dataresponse = response.data;
        return dataresponse;
    } catch (error) {
        console.error('Error fetching Roblox game name:', error);
        throw new Error('Error fetching Roblox game name');
    }
}

module.exports = {
    getRobloxGameName
};
