# Kubernetes

General introduction, concepts: http://kubernetes.io/docs/user-guide/


## Getting Started.

* Install the AWS CLI (See [AWS](https://github.com/minderlabs/demo/blob/master/docs/kbase/aws.md).
* Create the AWS credentials:

```
cp /keybase/private/richburdon,madadam/aws-credentials ~/.aws/credentials
```

* Install [kubectl](http://kubernetes.io/docs/getting-started-guides/kubectl/)

```
brew install kubectl
brew install kops
```

* Create the kube configuration (form the prod-ops repo):

```
mkdir -p ~/.kube && cp ${PROJECTS}/minderlabs/prod-ops/kube/config/dev ~/.kube/config
```

* Optional: set up bash completion for kubectl: http://kubernetes.io/docs/getting-started-guides/kubectl



## Deploying a service.

#### Cheat Sheet

* Deploying the demo-dev stack for the first time:
    ```
    cd config/k8s
    kubectl create -f demo.yml
    ```
* Pushing a new docker image to the `demo-dev` stack (if there are no configuration changes).
    Note that this is a disruptive push (the service will go down temporarily: don't use for
    prod.) First, make sure your AWS credentials are set up. See
    [AWS](https://github.com/minderlabs/demo/blob/master/docs/kbase/aws.md).
    ```
    cd sub/app
    ./scripts/docker_push.sh ecr
    ```
* Pushing configuration changes to the demo-dev stack.
    Note that this is a disruptive push (the service will go down temporarily, don't use for
    prod.)
    ```
    cd config/k8s
    kubectl replace -f demo.yml
    ```

* TODO: rolling-update instructions for prod.


#### Deploying a new service.

See the [kubernetes user guide](http://kubernetes.io/docs/user-guide/).

In short, create a config (yaml or json file), and then run
    ```
    kubectl create -f $CONFIG_FILE
    ```

Configs can be concatenated into one yaml file, each separated by `---`, or placed in separate files in a directory,
and launched with one command e.g. `kubectl create -f config_dir/`


### Updating a running service.

Several approaches:

1. If the config needs to change, you can manually edit it or use `kubectl replace`.
    You can manually edit a config via the admin UI or the commandline, e.g. to edit a
    service named `demo`:
    ```
    kubectl edit svc demo
    ```

1. To push a new container image in dev: if imagePullPolicy=always, or the image config uses the :latest tag, then
   kubernetes will pull the image on each push. Then you can just delete the pods and the
   ReplicaSet will recreate them and fetch the new image. For example to update the deployment
   with label `run: demo`, you can do:
    ```
    kubectl delete $(kubectl get pods -l run=demo -o name)
    ```
   See [here](http://kubernetes.io/docs/user-guide/config-best-practices/#container-images).

   Note that this is bad practice for production because you can’t roll back (see next bullet.)
   Also see:
   https://github.com/kubernetes/kubernetes/issues/9043
   https://github.com/kubernetes/kubernetes/issues/13488

1. For production, best practice is to use version numbers for each release, and use
   `kubectl rolling-update`. The docker images are tagged with each new release number,
   and the kubernetes config is updated each time to change the image version.


## Using Amazon container registry (ECR) to host images.

Kubernetes supports several options for hosting images, to pull images from a private repo (or private images
from docker hub), see [image pull secrets](http://kubernetes.io/docs/user-guide/images).

When running on AWS, the most convenient thing is to host images on ECR.

To push an image to ECR:

1. Run `docker login`, this prints the command with credentials:
    ```
    aws ecr get-login --region us-east-1
    ```

1. Use the ECR repo URI as the namespace, e.g.:
    ```
    docker tag minder-app-server:latest 240980109537.dkr.ecr.us-east-1.amazonaws.com/minder-app-server:latest
    docker push 240980109537.dkr.ecr.us-east-1.amazonaws.com/minder-app-server:latest
    ```
    A convenient way to get these commands is from the [ECR console](https://console.aws.amazon.com/ecs/home?region=us-east-1#/repositories),
    then select the repo and click "View Push Commands".


## Deploying a cluster on AWS

Following:
* http://kubernetes.io/docs/getting-started-guides/kops/
* https://github.com/kubernetes/kops/blob/master/docs/aws.md

Technical details about how it uses AWS infrastructure:
https://github.com/kubernetes/kops/blob/master/vendor/k8s.io/kubernetes/docs/design/aws_under_the_hood.md

1. Set up route53 hosted zone, and point parent DNS to it with NS records.
    http://kubernetes.io/docs/getting-started-guides/kops

1. Set up S3 bucket. Assuming aws CLI is installed and configured:
    ```
    export CLUSTER_NAME=dev.k.minderlabs.com
    aws s3 mb s3://clusters.${CLUSTER_NAME}
    export KOPS_STATE_STORE=s3://clusters.${CLUSTER_NAME}
    ```

1. Create the cluster config. This doesn't deploy anything yet:
    ```
    kops create cluster --zones=us-east-1d ${CLUSTER_NAME}
    ```

    Kubernetes `instance groups` correspond to aws autoscaling groups. 
    Can edit to change machine type, group size, zones, etc via:
    ```
    kops edit ig --name=${CLUSTER_NAME} nodes
    ```

1. Deploy:
    ```
    kops update cluster ${CLUSTER_NAME} --yes
    ```

    It creates a file ~/.kube/config with the data needed by `kubectl` including keys.
    It can take a few minutes for it to come up.

    We share kubeconfig files using the access-controlled github repo `prod-ops` in
    `//kube/configs/<cluster>`. Ask for access if you need it.

    The kubeconfig file can contain metadata about multiple clusters. A few useful commands
    for switching `contexts`:
    ```
    # List all known contexts, also shows the default.
    kubectl config get-contexts

    # Switch context to e.g. the research cluster.
    kubectl config use-context research.k.minderlabs.com
    ```

    Further reading on sharing and merging kubeconfig files: http://kubernetes.io/docs/user-guide/sharing-clusters/

1. Use `kubectl` to administer.

    ```
    kubectl cluster-info
    kubectl get nodes
    ```
    If these fail, the cluster is probably still coming up.

    The master is exposed at https://api.${CLUSTER_NAME}/ -- you can connect w/ HTTP basic auth,
    the credentials are in the kubeconfig file.

1. Optional, run the Dashboard UI service.
    http://kubernetes.io/docs/user-guide/ui
    ```
    kubectl create -f https://rawgit.com/kubernetes/dashboard/master/src/deploy/kubernetes-dashboard.yaml
    ```
    The service is created in the `kube-system` namespace, so to verify it's running do:
    ```
    kubectl --namespace kube-system get svc
    ```

    There are two ways to connect:
    1. Via a local kubernetes proxy:
        ```
        kubectl proxy
        ```
        then connect to http://localhost:8001/ui.

    1. Using http basic auth (see above), you can hit the master https://api.${CLUSTER_NAME}/ui.
    (TODO: better auth)
      
    E.g., https://api.dev.k.minderlabs.com/ui (self-sign cert: username=admin; password in ~/.kube/config)


1. Delete:
    ```
    kops delete cluster ${CLUSTER_NAME} # --yes
    ```

### Updating the cluster config.

E.g. to resize the cluster:
```
export CLUSTER_NAME=dev.k.minderlabs.com
export AWS_PROFILE=minder
export KOPS_STATE_STORE=s3://clusters.${CLUSTER_NAME}
kops edit ig --name=${CLUSTER_NAME} nodes
kops update cluster ${CLUSTER_NAME} --yes
```

and similarly to edit the master instancegroup:
```
# Get the master instance group name by looking at:
kops get instancegroups
kops edit ig --name=${CLUSTER_NAME} master-us-east-1d
kops update cluster ${CLUSTER_NAME} --yes
```

Note: It doesn't want to destroy the only master, so if you have only one
master replica and edit it's configuration (e.g. changing the instance type),
it'll update the config but leave the current config running. Instead, scale
up the group to 2, wait for the new one to come up, then scale back to 1.
It'll delete the older-config master and fail over.

Note that it took a long time (5 mins+?) to update the Route53 record for
`api.$CLUSTER_NAME`, meanwhile the dashboard was inaccessible externally.

When we do this for real: thread with some benchmarks to guide setting instance size for masters:
https://github.com/kubernetes/kubernetes/issues/21500
(e.g. For 100-node cluster, master can use as little as 50M up to 900M depending on workload.)

### Upgrading a cluster.

See https://github.com/kubernetes/kops/blob/master/docs/upgrade.md for the latest info.

In theory, this should work:
```
CLUSTER_NAME=research.k.minderlabs.com
kops upgrade $CLUSTER_NAME
```
As of 2017.03.05, you also have to do:
```
kops update cluster $CLUSTER_NAME --yes
kops rolling-update cluster $CLUSTER_NAME --yes
```

NOTE: This restarts the master instances. As of 2017.03.05, after that you need to reconfigure
Route53 with the new IP address of the master for `api.$CLUSTER_NAME`.

To check the current version, do `kubectl version` and look for the `Server Version` line.


## Ingress: Load balancing, reverse proxy, HTTPS termination.

Previously we used nginx-proxy to reverse proxy external requests to containers. I (Adam) tried it on kubernetes but
it doesn't seem to work, probably because of the way kubernetes uses docker differently.

I looked at a few other options for load balancing, https termination, and virtualhost-based routing.

* Current solution (2017-01-12): Manually create human-readable DNS records pointing to
  ELBs created by Kubernetes service LoadBalancer (with ugly names).
    * See [Issue 33](https://github.com/minderlabs/demo/issues/33) for details.
    * Use CNAMEs at the top-level DNS to point to cluster DNS names. E.g. `www CNAME
      www.prod.k.minderlabs.com`.

* The modern kubernetes way appears to be an [Ingress resource](http://kubernetes.io/docs/user-guide/ingress), although
it's a beta feature. Currently (2016-12-29) there is an
[nginx implementation](https://github.com/nginxinc/kubernetes-ingress) and a GCE implementation.

* Another option is [k8s-nginx-proxy](https://github.com/metral/k8s-nginx-proxy), but that needs skyDNS and predates Ingress.

The file `//config/k8s/nginx-ingress.yml` has a basic config to deploy the nginx ingress controller, with a simple
default http service (some default service is required). Deploy with:
```
kubectl create -f nginx-ingress.yml
```


## Tips & Tricks & Notes

* SSH into a container, using `kubectl exec`:
    ```
    kubectl exec demo-3814968984-0jpf1 -i -t -- bash -il
    ```

    Good example [here](https://github.com/metral/k8s-nginx-proxy) of using a one-off pod running a simple image
    (busybox in this example) as a tunnel endpoint for running `kubectl exec`.

* Viewing container logs. See `kubectl help logs` for more.
    ```
    # Stream logs for pod demo-1
    kubectl logs -f demo-1

    # Stream logs for container nginx within pod frontend-1
    kubectl logs -f -c nginx frontend-1
    ```

* [kubectl for Docker users](http://kubernetes.io/docs/user-guide/docker-cli-to-kubectl)

* Convert docker-compose config files to k8s configs using [compose2kube](https://github.com/kelseyhightower/compose2kube]).

* Deployments vs. Replica Sets (Replication Controllers): http://kubernetes.io/docs/user-guide/replicasets/
    > A Deployment is a higher-level concept that manages ReplicaSets and
    > provides declarative updates to pods along with a lot of other useful features. Therefore, we recommend using Deployments instead of directly using ReplicaSets, unless you require custom update orchestration or don’t require updates at all.
    > This actually means that you may never need to manipulate ReplicaSet objects: use directly a Deployment and define your application in the spec section.

* Kubernetes volumes vs Docker volumes: http://kubernetes.io/docs/user-guide/volumes/
    * k8s volume lifetime tied to a pod, shared among containers in the pod.
    * Many types of volumes supported, e.g. hostPath (local disk), awsElasticBlockStore, nfs, gitRepo.
    * Each container in the pod independently specifies where to mount each volume.
