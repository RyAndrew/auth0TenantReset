const utils = require('./utils');
const express = require('express');
const logger = require('./logger');
const auth0 = require('auth0-deploy-cli');

app = express();

app.get('/', function(req, res, next){
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

app.post('/tenantreset', async function(req, res, next){
    logger.info('/tenantreset');
    let output = ['<pre>'];
    output.push('resetting tenant: '+req.body.tenant);
    let mgmtToken;
    let url = new URL('https://'+req.body.tenant);
    url = `https://${url.host}/`
    logger.info('token url '+url)
    try{
        mgmtToken = await utils.getManagementToken(
            url,
            req.body.client_id,
            req.body.client_secret,
            'read:users delete:users'
        );
    } catch(err){
        console.log(err)
        let errMsg = 'Failed to get token ' + utils.formatCicManagementApiError(err);
        logger.error(errMsg);
        res.status(500).send(output + '\r\n\r\nError 500:\r\n' + errMsg);
        return;
    }
    let msg;
    msg = 'got token!';
    logger.info(msg);
    output.push(msg);

    msg = 'read users';
    logger.info(msg);
    output.push(msg);

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
    msg = users.length +' users found';
    logger.info(msg);
    output.push(msg);
    output.push(JSON.stringify(users,null,4))

    msg = 'deleting all users!';
    logger.info(msg);
    output.push(msg);

    users.forEach(async (user)=>{
        let deleteResult;
        msg = 'deleting user '+user.user_id;
        logger.info(msg);
        output.push(msg);
        try{
            deleteResult = await utils.callManagementApi('delete', url + 'api/v2/users/'+user.user_id, null, mgmtToken)
        } catch(err){
            console.log(err)
            let errMsg = 'Failed to read users ' + utils.formatCicManagementApiError(err);
            logger.error(errMsg);
            res.status(500).send(getOutput(output) + '\r\n\r\nError 500:\r\n' + errMsg);
            return;
        }
        console.log(deleteResult)
    })

    msg = 'running blank deploy cli!';
    logger.info(msg);
    output.push(msg);

    await auth0.deploy({
        input_file: './reset-tenant.yaml',
        config: {
            AUTH0_DOMAIN: req.body.tenant,
            AUTH0_CLIENT_ID: req.body.client_id,
            AUTH0_CLIENT_SECRET: req.body.client_secret,
            AUTH0_ALLOW_DELETE: true
        }
    })

    msg = 'tenant reset complete!';
    logger.info(msg);
    output.push(msg);
    
    res.send(getOutput(output))
})

function getOutput(output){
    return output.join('\r\n');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Application started'));