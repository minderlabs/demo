# AWS

## Install AWS CLI.

* Install the AWS command line tools following the
   [installation guide.](http://docs.aws.amazon.com/cli/latest/userguide/installing.html)

```
pip install --upgrade --user awscli
```

NOTE: This installs aws here: ~/Library/Python/2.7/bin (add to .bash_profile)

## Account setup

1. Get your IAM (Identity and Access Management) information from admin, including:
    * username
    * login password (the AWS console is at https://minderlabs.signin.aws.amazon.com/console)
    * Access credentials (access key and secret) for API access.

1. Create a credentials file at `$HOME/.aws/credentials` as follows, using the access credentials
   you received. If you have an existing credentials file, add this as a new profile:

```
[minder]
region = us-east-1
aws_access_key_id = <access_key>
aws_secret_access_key = <secret>
```

NOTE: The credentials files is stored here: `/keybase/private/richburdon,madadam/aws-credentials`

Set your default profile:

```
export AWS_DEFAULT_PROFILE=minder
```

To test the credentials:

```
aws iam get-user
```
