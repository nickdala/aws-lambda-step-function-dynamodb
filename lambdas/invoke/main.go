package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sfn"
)

type MyEvent struct {
	TaskId string `json:"taskId"`
}

type StepFunctionInput struct {
	TaskId    string `json:"taskId"`
	Timestamp int64  `json:"timestamp"`
}

func HandleRequest(ctx context.Context, myEvent MyEvent) (string, error) {
	taskId := myEvent.TaskId
	log.Printf("Task ID: %s", taskId)

	stateMachineArn := os.Getenv("StateMachineArn")
	log.Printf("State Machine Arm: %s", stateMachineArn)

	unixTime := time.Now().Unix()

	initialState := &StepFunctionInput{
		TaskId:    taskId,
		Timestamp: unixTime,
	}

	initialStateAsBytes, _ := json.Marshal(initialState)
	initialStateAsString := string(initialStateAsBytes)
	log.Printf("This is initial state %s\n", initialStateAsString)

	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		panic("unable to load SDK config, " + err.Error())
	}

	client := sfn.NewFromConfig(cfg)

	stateMachineExcutionName := fmt.Sprintf("%s-%v", taskId, unixTime)
	input := &sfn.StartExecutionInput{
		StateMachineArn: &stateMachineArn,
		Input:           &initialStateAsString,
		Name:            &stateMachineExcutionName,
	}

	result, err := client.StartExecution(ctx, input)
	if err != nil {
		log.Printf("StartExecution error: %v\n", err)
		return "", err
	} else {
		log.Printf("Started step function executed: %v\n", result)
	}

	return fmt.Sprintf("Started step function execution id %s!", stateMachineExcutionName), nil
}

func main() {
	lambda.Start(HandleRequest)
}
