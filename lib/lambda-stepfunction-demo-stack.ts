import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { JsonPath } from 'aws-cdk-lib/aws-stepfunctions';
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

    // Create a Map task, iterating over the items of the input
    const isItemInStockMappedTask = new cdk.aws_stepfunctions.Map(this, 'isItemInStockMappedTask', {
      itemsPath: '$.order',
      resultPath: JsonPath.DISCARD,
      parameters: {
        'item.$': '$$.Map.Item.Value',
      },
    }).iterator(
      new cdk.aws_stepfunctions_tasks.LambdaInvoke(this, 'isItemInStockTask', {
        lambdaFunction: isItemInStock,
      }),
    );

    // Create a Map task, iterating over the items of the input
    const updateItemStockMappedTask = new cdk.aws_stepfunctions.Map(this, 'updateItemStockMappedTask', {
      itemsPath: '$.order',
      resultPath: JsonPath.DISCARD,
      parameters: {
        'item.$': '$$.Map.Item.Value',
      },
    }).iterator(
      new cdk.aws_stepfunctions_tasks.LambdaInvoke(this, 'updateItemStockTask', {
        lambdaFunction: updateItemStock,
      }),
    );

    // Create simple task, calling the createOrder Lambda function
    const createOrderTask = new cdk.aws_stepfunctions_tasks.LambdaInvoke(this, 'createOrderTask', {
      lambdaFunction: createOrder,
    });

    const parallelState = new cdk.aws_stepfunctions.Parallel(this, 'parallelState', {});

    parallelState.branch(updateItemStockMappedTask, createOrderTask);

    const definition = isItemInStockMappedTask.next(parallelState);

    const myFirstStateMachine = new cdk.aws_stepfunctions.StateMachine(this, 'myFirstStateMachine', {
      definition,
    });

    const invokeStateMachineRole = new cdk.aws_iam.Role(this, 'invokeStateMachineRole', {
      assumedBy: new cdk.aws_iam.ServicePrincipal('apigateway.amazonaws.com'),
    });
    
    invokeStateMachineRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ['states:StartExecution'],
        resources: [myFirstStateMachine.stateMachineArn],
      }),
    );

    const createOrderResource = myFirstApi.root.addResource('create-order');

createOrderResource.addMethod(
  'POST',
  new cdk.aws_apigateway.Integration({
    type: cdk.aws_apigateway.IntegrationType.AWS,
    integrationHttpMethod: 'POST',
    uri: `arn:aws:apigateway:${cdk.Aws.REGION}:states:action/StartExecution`,
    options: {
      credentialsRole: invokeStateMachineRole,
      requestTemplates: {
        'application/json': `{
        "input": "{\\"order\\": $util.escapeJavaScript($input.json('$'))}",
        "stateMachineArn": "${myFirstStateMachine.stateMachineArn}"
      }`,
      },
      integrationResponses: [
        {
          statusCode: '200',
          responseTemplates: {
            'application/json': `{
            "statusCode": 200,
            "body": { "message": "OK!" }"
          }`,
          },
        },
      ],
    },
  }),
  {
    methodResponses: [
      {
        statusCode: '200',
      },
    ],
  },
);
  }
}

 




