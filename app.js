const utils = require('./utils');
const express = require('express');
const logger = require('./logger');
const auth0 = require('auth0-deploy-cli');

const app = express();

app.get('/', function(req, res, next){
    const errorMsg = req.query.errorMsg || '';
    res.send(`
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/semantic-ui@2.5.0/dist/semantic.min.css">
    <script
      src="https://code.jquery.com/jquery-3.6.3.slim.min.js"
      crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/semantic-ui@2.5.0/dist/semantic.min.js"></script>
<div class="ui card fluid">
  <div class="content">
        <div class="header">Tenant Reset</div>
  </div>
  <div class="content">
        Create a Machine to Machine Application authorized for the Management API
  </div>
  <div class="content" style="color:red">
    ${errorMsg}
  </div>
  <div class="content">
        <form class="ui form" method="post" action="/tenantreset">
        <div class="field">
        <label>Tenant Domain</label>
        <input type="text" name="tenant" placeholder="yourTenantNameHere.us.auth0.com" value="">
        </div>
        <div class="field">
        <label>Client ID</label>
        <input type="text" name="client_id" placeholder="Client ID" value="">
        </div>
        <div class="field">
        <label>Client Secret</label>
        <input type="text" name="client_secret" placeholder="Client Secret" value="">
        </div>
        <div class="field">
        <div class="ui checkbox">
            <input type="checkbox" name="accept" value="1" tabindex="0" class="hidden">
            <label>I understand EVERYTHING will be deleted in this tenant</label>
        </div>
        </div>
        <button class="ui button" type="submit">Reset</button>
    </form>
    </div>
</div>
<script>
$('.ui.checkbox')
  .checkbox()
;
</script>
`)
});

app.use(express.urlencoded({extended: true}))

const clientNamesToKeep=["Auth0 Dashboard Backend Management Client","Demo Platform Management","All Applications"];

app.post('/tenantreset', async function(req, res, next){
    logger.info('/tenantreset');
    if(!req.body.tenant || req.body.tenant == '' ||
       !req.body.client_id || req.body.client_id == '' ||
       !req.body.client_secret || req.body.client_secret == ''
    ){
        logger.info('invalid params');
        return res.redirect('/?errorMsg='+encodeURIComponent('Missing parameters!')); 
    }
    output = ['<pre>'];
    logAndOutputText('resetting tenant: '+req.body.tenant);
    
    const url = `https://${req.body.tenant}/`    
    let mgmtToken;
    try{
        mgmtToken = await utils.getManagementToken(
            url,
            req.body.client_id,
            req.body.client_secret,
            'read:users delete:users read:clients delete:clients'
        );
    } catch(err){
        logAndOutputText('Failed to get token. Please verify your url, client id, & client secret!');
        logAndOutputText(utils.formatCicManagementApiError(err));
        res.status(500).send(getOutput(output));
        return;
    }
    logAndOutputText('got token!');

    logAndOutputText('read users');

    let users;
    try{
        users = await utils.callManagementApi('get', url + 'api/v2/users', null, mgmtToken)
    } catch(err){
        console.log(err)
        let errMsg = 'Failed to read users ' + utils.formatCicManagementApiError(err);
        logger.error(errMsg);
        res.status(500).send(getOutput(output) + '\r\n\r\nError 500:\r\n' + errMsg);
        return;
    }
    logAndOutputText(users.length +' users found');
    output.push(JSON.stringify(users,null,4))

    logAndOutputText('deleting all users!');

    users.forEach(async (user)=>{
        let deleteResult;
        logAndOutputText('deleting user '+user.user_id);
        try{
            await utils.callManagementApi('delete', url + 'api/v2/users/'+user.user_id, null, mgmtToken)
        } catch(err){
            console.log(err)
            let errMsg = 'Failed to delete user ' + utils.formatCicManagementApiError(err);
            logger.error(errMsg);
            res.status(500).send(getOutput(output) + '\r\n\r\nError 500:\r\n' + errMsg);
            return;
        }
    })
  
    logAndOutputText('read clients');

    let clients;
    try{
        clients = await utils.callManagementApi('get', url + 'api/v2/clients', null, mgmtToken)
    } catch(err){
        console.log(err)
        let errMsg = 'Failed to read clients ' + utils.formatCicManagementApiError(err);
        logger.error(errMsg);
        res.status(500).send(getOutput(output) + '\r\n\r\nError 500:\r\n' + errMsg);
        return;
    }
    logAndOutputText(clients.length +' clients found');
    output.push(JSON.stringify(clients,null,4))

    logAndOutputText('deleting all clients!');

    clients.forEach(async (client)=>{
        if(clientNamesToKeep.includes(client.name)){
          logAndOutputText(`skipping client ${client.name} - ${client.client_id}`);
          return;
        }
      //dont delete this app
      if(req.body.client_id === client.client_id){
        return;
      }
        let deleteResult;
        logAndOutputText(`deleting client ${client.name} - ${client.client_id}`);
        try{
            await utils.callManagementApi('delete', url + 'api/v2/clients/'+client.client_id, null, mgmtToken)
        } catch(err){
            console.log(err)
            let errMsg = 'Failed to delete client ' + utils.formatCicManagementApiError(err);
            logger.error(errMsg);
            res.status(500).send(getOutput(output) + '\r\n\r\nError 500:\r\n' + errMsg);
            return;
        }
    })
  
    logAndOutputText('running blank deploy cli!');

    await auth0.deploy({
        input_file: './reset-tenant.yaml',
        config: {
            AUTH0_DOMAIN: req.body.tenant,
            AUTH0_CLIENT_ID: req.body.client_id,
            AUTH0_CLIENT_SECRET: req.body.client_secret,
            AUTH0_ALLOW_DELETE: true
        }
    })

    logAndOutputText('tenant reset complete!');
    
    res.send(getOutput(output))
})

let output = ['<pre>'];
function logAndOutputText(text){
    logger.info(text);
    output.push(text);
}
function getOutput(output){
    return output.join('\r\n');
}


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Application started'));
