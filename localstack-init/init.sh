#!/bin/sh
echo "=== INICIANDO CONFIGURACIÓN DE RECURSOS LOCALES EN LOCALSTACK ==="

# 1. Crear Bucket de S3 y subir catálogo de productos
awslocal s3api create-bucket --bucket mfl-analyzer-data --region eu-west-1 --create-bucket-configuration LocationConstraint=eu-west-1
awslocal s3api put-object --bucket mfl-analyzer-data --key products/products.json --body /etc/localstack/init/ready.d/products.json

# 2. Crear Tabla DynamoDB 'orders' para el webhook
awslocal dynamodb create-table \
    --table-name orders \
    --attribute-definitions \
        AttributeName=order_id,AttributeType=S \
        AttributeName=user_id,AttributeType=S \
        AttributeName=created_at,AttributeType=N \
    --key-schema \
        AttributeName=order_id,KeyType=HASH \
    --global-secondary-indexes \
        "[{\"IndexName\": \"UserOrdersIndex\", \"KeySchema\": [{\"AttributeName\": \"user_id\", \"KeyType\": \"HASH\"}, {\"AttributeName\": \"created_at\", \"KeyType\": \"RANGE\"}], \"Projection\": {\"ProjectionType\": \"ALL\"}}]" \
    --billing-mode PAY_PER_REQUEST \
    --region eu-west-1

echo "=== RECURSOS DE LOCALSTACK CONFIGURADOS CON ÉXITO ==="
