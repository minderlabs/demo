## Minikube
https://kubernetes.io/docs/getting-started-guides/minikube/

### Installation

```
curl -Lo minikube https://storage.googleapis.com/minikube/releases/v0.16.0/minikube-linux-amd64 &&
chmod +x minikube
sudo chown root:admin minikube
sudo mv minikube /usr/local/bin
```

Start. Note that this edits your `~/.kube/config` and sets minikube as the default cluster
using the equivalent of `kubectl config use-context minikube`.
```
minikube start

# Optionally start the kubernetes dashboard.
minikube dashboard
```

Test:
```
kubectl run -it ubuntu --image=ubuntu:16.04 --restart=Never
```

### Tips:

Add this to bashrc for convenience -- running it configures docker to use minikube as docker host,
so you can build images directly on the minikube cluster.
```
alias minikube_on='eval "$(minikube docker-env)"'
```

Useful commands:
```
# SSH to the minikube host (i.e. virtualbox -- not any specific pod).
minikube ssh

# Switch kubernetes contexts to minikube.
kubectl config use-context minikube
```

### Mounting a volume from your local host

See the example configs in this directory, and edit them accordingly to mount a volum

* Edit host-volume.yml, specifically hostPath.path, and then:

    `kubectl create -f host-volume.yml`

* Then you can use the persistent volume in a pod, for example see:

    `kubectl create -f example-mount-host-volume.yml`
