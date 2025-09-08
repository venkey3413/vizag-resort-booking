#!/bin/bash

# Deploy booking trigger Lambda
echo "Deploying booking-trigger Lambda..."
zip -r booking-trigger.zip booking-trigger.js
aws lambda create-function \
    --function-name booking-trigger \
    --runtime nodejs18.x \
    --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role \
    --handler booking-trigger.handler \
    --zip-file fileb://booking-trigger.zip

# Deploy admin trigger Lambda
echo "Deploying admin-trigger Lambda..."
zip -r admin-trigger.zip admin-trigger.js
aws lambda create-function \
    --function-name admin-trigger \
    --runtime nodejs18.x \
    --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role \
    --handler admin-trigger.handler \
    --zip-file fileb://admin-trigger.zip

echo "Lambda functions deployed successfully!"