# 演示环境后端镜像：多阶段构建，服务器上无需安装 JDK / Maven
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /build/target/*.jar app.jar
# 连接配置（数据库 / Redis / MinIO）由 compose 挂载到 /app/config/application-demo.yml：
# 外部 config 目录优先级高于 classpath，改地址 / 只读开关无需重新打镜像
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
