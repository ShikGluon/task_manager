FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY TaskManager.Api/TaskManager.Api.csproj TaskManager.Api/
RUN dotnet restore TaskManager.Api/TaskManager.Api.csproj
COPY TaskManager.Api/ TaskManager.Api/
RUN dotnet publish TaskManager.Api/TaskManager.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
RUN mkdir -p /app/data /app/logs
COPY --from=build /app/publish .
ENV ASPNETCORE_ENVIRONMENT=Docker
ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000
ENTRYPOINT ["dotnet", "TaskManager.Api.dll"]
