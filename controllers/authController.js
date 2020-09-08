const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const AppError = require(`../utils/appError`);
const User = require(`../models/userModel`);
const catchAsync = require(`../utils/catchAsync`);
const Email = require(`../utils/email`);

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('JWT', token, cookieOptions);

  //Remove the  password from user
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: user,
    },
  });
};

exports.logout = (req, res, next) => {
  res.cookie('JWT', 'loggedOut', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  const email = new Email(newUser, url);
  await email.sendWelcome();
  createSendToken(newUser, 201, res);
});

exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  // ! 1)Check if email and password exsists
  if (!email || !password) {
    return next(new AppError('Please specify your email and password', 400));
  }
  // ! 2) Check if the user exists and the password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  // ! 3) If every thing ok, send token to client
  createSendToken(user, 200, res);
};

exports.protect = catchAsync(async (req, res, next) => {
  //! 1) Getting token and check if its there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.JWT) {
    token = req.cookies.JWT;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in ! Please loggin to get access', 401)
    );
  }
  //!  2) Verification of signToken

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //!  3) Check if user still exsists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        `The user belonging to this token does no longer exsists`,
        401
      )
    );
  }

  //! 4)  Check if user changed the password after jwt was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(`User recently changed password! Please login again`, 401)
    );
  }
  req.user = currentUser;
  res.locals.user = currentUser;

  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //! 1) Get User based on the  Posted Email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError(`There is no user with this email address`, 404));
  }

  //! 2) Generate a random reset Token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //! 3) Send it top user Email
  const resetUrl = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  try {
    // await sendEmail({
    //   email: user.email,
    //   subject: `Your password reset token ( only valid for 10 minutes . Hurry!!!!)`,
    //   message,
    // });
    await new Email(user, resetUrl).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      message: 'Token send to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError(`Error in sending email ! please try later`, 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //!  1) Get the user based on the Token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  //!  2) if the Token has not expired , and there is a user,set the new password
  if (!user) {
    return next(new AppError(`Token is Invalid or Expired`, 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  //!  3) update the changePasswordProperty => Done through using pre save hook

  //!  4) Log the user-in, Send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //! 1) Get user from collection
  const user = await User.findById(req.user._id).select('+password');

  //! 2) Check if the posted current password is correctPassword
  if (!(await user.correctPassword(req.body.passwordCurrent))) {
    return next(new AppError(`Incorrect password`, 401));
  }
  //! 3) If so update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  //! 4)) log user-in , Send JWT
  createSendToken(user, 200, res);
});

// ? Only for rendered pages , no errors
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.JWT) {
    try {
      //* Verify the Token
      const decoded = await promisify(jwt.verify)(
        req.cookies.JWT,
        process.env.JWT_SECRET
      );

      //*  Check if user still exsists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      //* Check if user changed the password after jwt was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      //* There is a logged in user
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};
