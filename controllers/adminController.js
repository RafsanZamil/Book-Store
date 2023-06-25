const User = require("../models/user.model");

const loadLogin = async (req, res) => {
    try {
        res.render('login')
        
    } catch (error) {
        console.log(error);
    }
        
    }

const verifylogin = async (req, res) => {
    try {

        const username = req.body.email;
        const password = req.body.password;

        const userData = await User.findOne({ username: username });

        if (userData) {
            passport.authenticate("local")
            if(userData.isAdmin===false){
                res.render('login',{message:"you are not admin"});
            }else{
                req.session.user_id = userData._id
                res.redirect("/admin/Dashboard")}
            }
        else {
            res.render('login',{message:"email and pass is incorrect"})
                
            }
        }
         catch (error) {
        console.log(error);
    }
}

module.exports = {
    loadLogin,verifylogin
}
