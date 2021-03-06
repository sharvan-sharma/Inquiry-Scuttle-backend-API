
const {Users} = require('../../../src/config/models')
const {masterLogger} = require('../../../src/logger')

module.exports = (req,res,next)=>{
    if(req.isAuthenticated()){
        Users.findOneAndUpdate(
            {_id:req.user._id},
            {'$set':{login_status:'A'}},
            {new:true,strict:false},
            (err,user)=>{
            if(err){
                res.json({status:500,type:'server_error'})
                masterLogger.error(`user  login error while setting login_status to 'A'`)
            }else if(user){
                res.json({  status:200,
                            logged_in:true,
                            name:req.user.name,
                            email:req.user.email,
                            createdAt:req.user.createdAt,
                            photo:req.user.photo})
                masterLogger.info(`user ${req.user.email} login successfully login_status set to 'A'`)
            }else{res.json({status:401,type:'unauthenticated'})}
        })
    }else{res.json({status:401,type:'unauthenticated'})}
}