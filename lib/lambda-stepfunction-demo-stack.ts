import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import path = require('path');
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class LambdaStepfunctionDemoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // Provision a new REST API Gateway
    const myFirstApi = new cdk.aws_apigateway.RestApi(this, 'myFirstApi', {});

    // Provision a new DynamoDB table
    const storeDB = new cdk.aws_dynamodb.Table(this, 'storeDB', {
      partitionKey: {
        name: 'PK',
        type: cdk.aws_dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: cdk.aws_dynamodb.AttributeType.STRING,
      },
      billingMode: cdk.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Provision a new Lambda function, and grant it read access to the DynamoDB table
    const isItemInStock = new cdk.aws_lambda_nodejs.NodejsFunction(this, 'isItemInStock', {
      entry: path.join(__dirname, 'isItemInStock', 'handler.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: storeDB.tableName,
      },
    });
    storeDB.grantReadData(isItemInStock);

    // Provision a new Lambda function, and grant it write access to the DynamoDB table
    const updateItemStock = new cdk.aws_lambda_nodejs.NodejsFunction(this, 'updateItemStock', {
      entry: path.join(__dirname, 'updateItemStock', 'handler.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: storeDB.tableName,
      },
    });
    storeDB.grantWriteData(updateItemStock);

    // Provision a new Lambda function, and grant it write access to the DynamoDB table
    const createOrder = new cdk.aws_lambda_nodejs.NodejsFunction(this, 'createOrder', {
      entry: path.join(__dirname, 'createOrder', 'handler.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: storeDB.tableName,
      },
    });
    storeDB.grantWriteData(createOrder);

    // Provision a new Lambda function, and grant it write access to the DynamoDB table
    const createStoreItem = new cdk.aws_lambda_nodejs.NodejsFunction(this, 'createStoreItem', {
      entry: path.join(__dirname, 'createStoreItem', 'handler.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: storeDB.tableName,
      },
    });
    storeDB.grantWriteData(createStoreItem);

    // Add a new POST route to the REST API Gateway, and link it to the createStoreItem Lambda function
    const createStoreItemResource = myFirstApi.root.addResource('create-store-item');
    createStoreItemResource.addMethod('POST', new cdk.aws_apigateway.LambdaIntegration(createStoreItem));
  }
}

 




