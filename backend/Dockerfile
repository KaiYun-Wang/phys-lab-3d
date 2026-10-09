# 后端镜像：多阶段构建，服务器无需安装 JDK / Maven
# 连接配置由 compose 挂载到 /app/config，不打进镜像
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
COPY pom.xml .
# 先装依赖：pom.xml 不变时命中缓存
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /build/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-Duser.timezone=Asia/Shanghai", "-jar", "/app/app.jar"]
