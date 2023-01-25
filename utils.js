const axios = require('axios');
const logger = require('./logger');

class Utils {
async getManagementToken(issuer, client_id, client_secret, scope){
    logger.debug('getManagementToken')
    
    const resp = await axios({
        method: 'post',
        url: issuer+'oauth/token',
        data: {
            grant_type: 'client_credentials',
            client_id: client_id,
            client_secret: client_secret,
            scope: scope,
            audience: issuer+'api/v2/',
        }
    })
    return resp.data.access_token
}


async callManagementApi(method, url, body, token){
    logger.debug('callManagementApi')
    const resp = await axios({
        method: method,
        url: url,
        headers: { 'Authorization':'Bearer '+token },
        data:body
    })
    return resp.data;
}

formatCicManagementApiError(error){
    //is the error in the format of a CIC management response?
    if(error?.response?.data?.errorCode){
        return error.response.data.statusCode +' '+
        error.response.data.error +'! message:'+
        error.response.data.message +' errorCode:'+
        error.response.data.errorCode;
    }
    //is this an axios error?
    if(error?.toJSON){
        return error.toJSON();
    }
    if(typeof error === 'object'){
        return JSON.stringify(error);
    }
    return error;
}
}
module.exports = new Utils()