pipeline {
    agent any

    environment {
        BASE_DIR = "/home/aman/Desktop"
        OLD_DIR = "${BASE_DIR}/CPE-800-Dashboard"
        BACKUP_DIR = "${BASE_DIR}/prev"
        SERVICE_NAME = "npmapp.service"
        REPO_URL = "https://github.com/bieben/CPE-800-Dashboard.git"
    }

    stages {
        stage('Backup or Remove Old Project') {
            steps {
                script {
                    if (fileExists(OLD_DIR)) {
                        sh '''
                            mkdir -p ${BACKUP_DIR}
                            TIMESTAMP=$(date +%Y%m%d%H%M%S)
                            mv ${OLD_DIR} ${BACKUP_DIR}/CPE-800-Dashboard-$TIMESTAMP
                        '''
                    }
                }
            }
        }

        stage('Clone Repo') {
            steps {
                sh '''
                    echo "Cleaning up ${OLD_DIR} before clone..."
                    rm -rf ${OLD_DIR}
                    git clone ${REPO_URL} ${OLD_DIR}
                '''
            }
        }

        stage('Install Node Modules') {
            steps {
                sh "cd ${OLD_DIR} && npm install"
            }
        }

        stage('Restart Node App') {
            steps {
                sh "sudo systemctl daemon-reexec"
                sh "sudo systemctl restart ${SERVICE_NAME}"
            }
        }
    }
}
