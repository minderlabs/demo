# Google Cloud


## Set-up

~~~~
    - <https://cloud.google.com/sdk>
    - <https://console.developers.google.com>

    gcloud components update

    gcloud auth login
    gcloud config set account rich.burdon@gmail.com
    gcloud config set project dark-zero    
    gcloud config list
~~~~

## App Engine

~~~~
    - <https://cloud.google.com/sdk/gcloud-app>
    
    - <https://appengine.google.com>
    - <https://console.developers.google.com/project/dark-zero/appengine>
    
    gcloud preview app modules list default

    gcloud preview app run app.yaml 

    gcloud preview app deploy -q --set-default app.yaml
~~~~
