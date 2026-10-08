# main 部署用后端镜像：多阶段构建，服务器上无需安装 JDK / Maven
# 连接配置（PG / Redis / MinIO）不打进镜像：
# compose 会把宿主机 config/application-aliyun.yml 挂到 /app/config/，
# Spring Boot 外部 config 目录优先级高于 jar 内配置（profile 默认 aliyun）
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
COPY pom.xml .
# 依赖单独成层：pom.xml 不变时重复构建直接命中缓存
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /build/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-Duser.timezone=Asia/Shanghai", "-jar", "/app/app.jar"]
