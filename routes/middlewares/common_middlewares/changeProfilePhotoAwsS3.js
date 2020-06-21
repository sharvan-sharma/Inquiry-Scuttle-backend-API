
const Busboy = require('busboy')
const fs = require('fs')
const path = require('path')
const {Users} = require('../../../src/config/models')
const {masterLogger,s3logger} = require('../../../src/logger')
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
    accessKeyId:process.env.IAM_USER_KEY,
    secretAccessKey:process.env.IAM_USER_SECRET
})


function changeProfilePhotoAwsS3(req,res,next){
    if(!req.isAuthenticated()){
        res.json({status:401,type:'unauthorised'})
    }else{
        const busboy = new Busboy({headers:req.headers,limits:{files:1,fileSize:512000}})

        busboy.on('file',(fieldname, file, filename, encoding, mimetype)=>{

            let typeArray = ['jpg','bmp','png']
            let ext = filename.split('.').pop()
            let limitCrossed = false

            if(typeArray.includes(ext)){

                const fname = 'ins/images/'+req.user._id+new Date().getTime()+'.'+ext

                const params = {
                    Bucket: process.env.BUCKET_NAME,
                    Key: fname,
                    Body: file
                };

                s3.upload(params, function(err, data) {
                    if (err) {
                        if(!limitCrossed){
                            res.json({status:500,type:'s3'})
                        }
                        s3logger.error(`use ${req.user.email} try to upload ${fname} got error.`)
                    }else{
                        if(limitCrossed){
                            const delparam = {
                                Bucket: process.env.BUCKET_NAME,
                                Key: fname,
                            };
                            s3.deleteObject(delparam,(err,data)=>{
                                 if (err){
                                     s3logger.error(`user ${req.user.email} error while deleting ${fname} due to file size limit exceeds.`)
                                 }else{
                                     s3logger.info(`user ${req.user.email} successfully deleted ${fname} due to file size limit exceeds.`)
                                 }
                            })
                        }else{
                            res.json({status:200,photo:data.Location})

                            s3logger.info(`user ${req.user.email} successfully updated profile photo to ${fname} `)
                            
                            Users.findOneAndUpdate({_id:req.user._id},
                                {'$set':{photo:data.Location}},
                                {new:true,strict:false},
                                (err,user)=>{
                                    if(err){
                                        masterLogger.error(`user ${req.user.email} error while updating photo url`)
                                    }else if(user){
                                        if(req.user.photo !== null){
                                            
                                            const delparam2 = {
                                                    Bucket: process.env.BUCKET_NAME,
                                                    Key: 'images'+req.user.photo.split('images').pop(),
                                            }

                                            s3.deleteObject(delparam2,(err,data)=>{
                                                if (err){
                                                    s3logger.error(`user ${req.user.email} error while deleting ${fname} after updating with new one`)
                                                }else{
                                                    s3logger.info(`user ${req.user.email} successfully deleted ${'images'+req.user.photo.split('images').pop()} after updating with new one`)
                                                }
                                            })
                                        }
                                    }
                            })
                        }
                    }
                });

                file.on('limit',()=>{
                    limitCrossed = true
                    res.json({status:455,type:'exceed'})
                })
            }
        })

    req.pipe(busboy)
    }
}

module.exports = changeProfilePhotoAwsS3