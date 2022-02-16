# AWS Lambda, Step Functions, DynamoDB, and CDK!

Example project of an AWS Lambda triggering the execution of a Step Function.  The Step Function contains tasks that insert and update items in the DynammDB table `Tasks`.  The AWS resources are deployed using the [AWS CDK](https://aws.amazon.com/cdk).  The main stack is defined in the file [aws-stepfunction-status-stack.ts](./lib/aws-stepfunction-status-stack.ts).

## DynamoDB

The following code in 

```typescript
const dynamoTable = new Table(this, 'Tasks', {
      partitionKey: {
        name: 'taskId',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'timestamp',
        type: AttributeType.NUMBER
      },
      tableName: 'Tasks',
    });
```

The primary key for the `Tasks` table is the taskId.  The sort key is the unix time represented as a number.  The above code will produce the following DynamoDB table.

![dynamodb-primary-sort-key](./images/dynamodb-primary-sort-key.png)

## Step Function

The step function consists of a combination of the following.
* [DynamoPutItem](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions_tasks.DynamoPutItem.html)
* [DynamoUpdateItem](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions_tasks.DynamoUpdateItem.html)
* [Wait](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions.Wait.html)

When assembled together in [aws-stepfunction-status-stack.ts](./lib/aws-stepfunction-status-stack.ts), the step function looks like the following.

![step-function-definition](./images/step-function-definition.png)

## Lambda

The lambda function is written in Go and is responsible for starting the execution of the step function.  The Lambda function handler will process events with the following json structure.

```json
{
  "taskId": <id>
}
```

When the function is invoked, the Lambda runs the handler method. The handle method prepares the following json to be passed as the inital state to the step function.

```json
{
  "taskId": <id>,
  "timestamp": <unix time stamp>
}
```

acomposed of a taskId has a primary key is a blank project for TypeScript development with CDK.

The `cdk.json` file tells the CDK Toolkit how to execute your app.



## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
