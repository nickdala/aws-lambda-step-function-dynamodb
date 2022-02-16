import { Stack, StackProps, RemovalPolicy, Duration } from 'aws-cdk-lib';
import { AttributeType, Table, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import * as lambdago from '@aws-cdk/aws-lambda-go-alpha';

export class AwsStepfunctionStatusStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    /* Tasks DynamoDB table */
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
      billingMode: BillingMode.PAY_PER_REQUEST,

      /**
       *  The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
       * the new table, and it will remain in your account until manually deleted. By setting the policy to
       * DESTROY, cdk destroy will delete the table (even if it has data in it)
       */
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    /** ------------------ Step functions Definition ------------------ */
    const logStartTask = new tasks.DynamoPutItem(this, 'CreateDynamoTaskItem', {
      item: {
        taskId: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.taskId')),
        // Can't use fromNumber - see https://github.com/aws/aws-cdk/issues/12456
        // timestamp: tasks.DynamoAttributeValue.fromNumber(sfn.JsonPath.numberAt('$.timestamp')),
        timestamp: tasks.DynamoAttributeValue.numberFromString(
          sfn.JsonPath.stringAt(`States.Format('{}', ${'$.timestamp'})`)),
        Status: tasks.DynamoAttributeValue.fromString("STARTED")
      },
      table: dynamoTable,
      
      resultPath: sfn.JsonPath.DISCARD
    });

    const waitX = new sfn.Wait(this, 'Execute long running task...wait 30 seconds', {
      time: sfn.WaitTime.duration(Duration.seconds(30)),
    });

    const logEndTask = new tasks.DynamoUpdateItem(this, 'UpdateDynamoTaskItem', {
      key: {
        taskId: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.taskId')),
        // Can't use fromNumber - see https://github.com/aws/aws-cdk/issues/12456
        // timestamp: tasks.DynamoAttributeValue.fromNumber(sfn.JsonPath.numberAt('$.timestamp')),
        timestamp: tasks.DynamoAttributeValue.numberFromString(
          sfn.JsonPath.stringAt(`States.Format('{}', ${'$.timestamp'})`))
      },
      table: dynamoTable,
      expressionAttributeValues: {
        ':val': tasks.DynamoAttributeValue.fromString('Done')
      },
      expressionAttributeNames: {
        "#s": "Status"
      },
      updateExpression: 'SET #s = :val',
    });

    const definition =  logStartTask.next(waitX).next(logEndTask);
    const stateMachine = new sfn.StateMachine(this, 'StateMachine', {
      definition
    });
    // don't forget permissions. You need to assign them
    dynamoTable.grantWriteData(stateMachine);

    // The code that defines your stack goes here
    const invokeStepFunction = new lambdago.GoFunction(this, 'invokeStepFunction', {
      entry: 'lambdas/invoke',
      environment: {
        StateMachineArn: stateMachine.stateMachineArn
      },
      functionName: 'InvokeTaskStepFunction'
    });

    stateMachine.grantStartExecution(invokeStepFunction)
  }
}
