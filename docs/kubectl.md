# Kubectl wrapper

Allows to use common kubectl commands inside fbl flow.

## Action Handler: Apply ConfigMap

**ID:** a6s.k8s.kubectl.apply.ConfigMap

**Aliases:**

- k8s.kubectl.apply.ConfigMap
- kubectl.apply.ConfigMap
- kubectl.ConfigMap

**Example:**

```yaml
kubectl.ConfigMap:
  # Name of the ConfigMap
  name: application-config-map
  # [optional] K8s namespace
  namespace: default
  # [optional] files to apply
  files:
    # note: just like with kubectl test.yml will be used as key inside the ConfigMap
    # make sure not to pass paths to files with same name
    - some/path/to/test.yml
  # [optional] define config map values inline (key/value pairs)
  inline:
    # where value can be a string ...
    host: foo.bar
    # ... or number
    port: 8000
```

## Action Handler: Apply Secret (Generic)

**ID:** a6s.k8s.kubectl.apply.Secret.generic

**Aliases:**

- k8s.kubectl.apply.Secret.generic
- kubectl.apply.Secret.generic
- kubectl.Secret.generic
- kubectl.Secret

**Example:**

```yaml
kubectl.Secret:
  # Name of the ConfigMap
  name: application-secret
  # [optional] K8s namespace
  namespace: default
  # [optional] files to apply
  files:
    # note: just like with kubectl test.yml will be used as key inside the ConfigMap
    # make sure not to pass paths to files with same name
    - some/path/to/test.yml
  # [optional] define config map values inline (key/value pairs)
  inline:
    # where value can be a string ...
    host: foo.bar
    # ... or number
    port: 8000
```

## Action Handler: Docker Registry Secret

**ID:** a6s.k8s.kubectl.apply.Secret.docker-registry

**Aliases:**

- k8s.kubectl.apply.Secret.docker-registry
- kubectl.apply.Secret.docker-registry
- kubectl.Secret.docker-registry
- kubectl.Secret.docker

**Example:**

```yaml
kubectl.Secret.docker:
  # secret name
  name: docker-secret
  # [optional] k8s namespace
  namespace: default

  # docker registry host
  server: docker.foo.bar.com
  # docker registry user credentials
  username: root
  password: toor
  # docker user email address
  email: foo@bar.com
```

## Action Handler: TLS Secret

**ID:** a6s.k8s.kubectl.apply.Secret.tls

**Aliases:**

- k8s.kubectl.apply.Secret.tls
- kubectl.apply.Secret.tls
- kubectl.Secret.tls

**Example:**

```yaml
kubectl.Secret.tls:
  # secret name
  name: docker-secret
  # [optional] k8s namespace
  namespace: default

  # [optional] load certificate and key from files
  files:
    cert: /path/to/cert.crt
    key: /path/to/cert.key

  # [optional] define key and certificate inline
  inline:
    cert: |-
      -----BEGIN CERTIFICATE-----
      MIIDBzCCAe+gAwIBAgIJAODta5Fpp03BMA0GCSqGSIb3DQEBBQUAMBoxGDAWBgNV
      BAMMD3d3dy5leGFtcGxlLmNvbTAeFw0xODEwMjUxMjU3MzdaFw0yODEwMjIxMjU3
      MzdaMBoxGDAWBgNVBAMMD3d3dy5leGFtcGxlLmNvbTCCASIwDQYJKoZIhvcNAQEB
      BQADggEPADCCAQoCggEBAMRniplTwrj0vb9PgM2A6YSccRpPXcoU+UEzwHUQ0gGD
      4juiV3kc+qYhGC+O4GS89Kq0AUwlfBs+5bUAwFonoCx/2cr/H00yWWYttMsbQ0D7
      AyIWnIc4vWDAPtPN6TrZB6IloZQ5L7Q5MtEYChkqMmLGCwtNe/EE9r4ei+w/fmKa
      NMc8muNqDo3M+gkDk3pzZg20rkd6sUb5eEd5k4G707NZDfA2BcR9mhNhprbSyo5y
      AzKsymK9Gx7auIhWicX37S4ryK1+pGSO3PUyJ9TWiORYqvrgD8i4Gnx5FUnEhqq5
      DODW7iRiieJAlE2og67iBEntC8baZZhPNFj2wcZChwECAwEAAaNQME4wHQYDVR0O
      BBYEFD/2St6ZG5F1wyX++Y1+4ogESIrrMB8GA1UdIwQYMBaAFD/2St6ZG5F1wyX+
      +Y1+4ogESIrrMAwGA1UdEwQFMAMBAf8wDQYJKoZIhvcNAQEFBQADggEBAHFh3H3R
      8O78/HU8eV/W7O52URllBnEk1XPyEp+DjKOETNqSkcXJbeFD0uadr3mTnH1qwC4V
      r+SnqsYowaHCv3oL2AbITXUWJZe5+CUp/owXOlVNPiCzUYMBmnYtleVV75BWOMlb
      Y/LyagUA4AcSMs7q3QkjjsoIgR4Ev7R8L7lROiWDvfi2F2uRlKmnFDMKchFqoqqC
      vI4LocmEq6y8hNU6wEhJEYWSxEkbgxMg6aEwjBxFQQ3Q2C532/uqM+3Bn3MBsTfO
      Q+iFFDBLV3pSivdqexgO2oBl7e+9fn7hQwhhEF5oz/wXiYZaeKgx95H9ZnMnoMXX
      Rv2TYPiajCOe3ZM=
      -----END CERTIFICATE-----

    key: |-
      -----BEGIN RSA PRIVATE KEY-----
      MIIEpAIBAAKCAQEAxGeKmVPCuPS9v0+AzYDphJxxGk9dyhT5QTPAdRDSAYPiO6JX
      eRz6piEYL47gZLz0qrQBTCV8Gz7ltQDAWiegLH/Zyv8fTTJZZi20yxtDQPsDIhac
      hzi9YMA+083pOtkHoiWhlDkvtDky0RgKGSoyYsYLC0178QT2vh6L7D9+Ypo0xzya
      42oOjcz6CQOTenNmDbSuR3qxRvl4R3mTgbvTs1kN8DYFxH2aE2GmttLKjnIDMqzK
      Yr0bHtq4iFaJxfftLivIrX6kZI7c9TIn1NaI5Fiq+uAPyLgafHkVScSGqrkM4Nbu
      JGKJ4kCUTaiDruIESe0LxtplmE80WPbBxkKHAQIDAQABAoIBADBhkTLT/1Owdk16
      ODBnYR7ZqsLgaiotoHj/Vpl/2zukUUZ/ZyzehqAF5v9QItat9VdXoDoxwbC0fcFo
      vfl3aW2M0QnAbuWFUaBqAe9Gd/q52ru69jQZNg1vTgq+3oUwkUDQJE1vCOFMdcgs
      M9CfJGpQfsf5/l4Q6vdKbw1zVp7TDx1QwdQdH3WSHkSz55I5G1+q9dmWW1kbf1/9
      J/bQpZYQmwymHhg1y4SC6+P7NzysEMO54QezW8M3BE+nI1o00pqWJvomRZlyXTUl
      JUBNVhgRduAogyhb+pqraTabwyiz2poKHH74rTtpY5Y4p/tQBmyi6jblj1HZxKK5
      5LGZSwECgYEA7qJI6q8e66OFme0cf4IabWAe5zB4KwJ7KY1yWzOhramifGqxs+6f
      ofbwVufdJ8EysfRd8kWN4o2su1Y+g2PD5FiYKhhffTNytODeI+mVpdqme52CLNJq
      yH3M5BMYMQyaCZx1o5KQO2s+pbAVA9k3RGcZbN+U0twwxJscV7PX9F0CgYEA0rKH
      HHbIq183lYj3X/znWDCn9TG10uYAlVTZrbZ/L1GrpBYd5ssmOCNRVkus5SaA0R6t
      qKTabLp9yli7HfU6roVDa5SoavBJNmwTqQCGTcRPwn6dAmi97GcbxBVbf2j7sZqR
      pcN3yja2VycmbgL0jbP+pNZGvkGu87rU9/iRsvUCgYBwviV7E1+lbq1pStgi+eHo
      ePhAu+qaT2LG//feVOd29+U3qOTqILw0tklYldUruiBsaQqVsvzU46CPJbEFPHZJ
      hP3nLXq32T3BbVgmWW6FXGc5kfH1oTgoHx9VRhww2EZSciQ2MsGIASQo/acAGXj+
      DUO652sVsEguKyZZ3TMTVQKBgQCGhcu0Bbcbi4CercNbespuSSqDZ0iyrX0D2xfc
      TF+p45gV/LT8rQnq38nHsitiZxHp8o9n1FFNCEjWD47wkqjz0kv4fQKGvIHSCHEI
      /zfAoS1XfaVba2qPbEmTCRvRHkNM4uZJEqMB7aq/vFRR+vsPGjPkJJcoVCGSpd/h
      rse/nQKBgQDtEGr38AlBITx7gdXmMmjV5lIguhW72pnPnqcOxtmW2C4ZI5GPDxPI
      SSR5nGd5OdRceSVIR/pB/fFr13O8toEAKmY7AABEBTCIsBIo6+gnixFMG/y6UMA3
      2bHuV0PWZj9bHBsADDKhZ8/keNbiTSLJdgOcM85ug6uE47krZtGEIw==
      -----END RSA PRIVATE KEY-----
```

## Action Handler: Apply K8s Object

**ID:** a6s.k8s.kubectl.apply

**Aliases:**

- k8s.kubectl.apply
- kubectl.apply

**Example:**

```yaml
kubectl.apply:
  kind: ObjectKind
  apiVersion: v1
  metadata:
    name: test
  # all other fields are optional for the plugin, but may be required by K8s itself
  # please reference object related documentation for what fields should be provided
```

## Action Handler: Delete K8s Object

**ID:** a6s.k8s.kubectl.delete

**Aliases:**

- k8s.kubectl.delete
- kubectl.delete

**Example:**

```yaml
kubectl.delete:
  # object type
  kind: ObjectKind
  metadata:
    # object name
    name: test
    # [optional] k8s namespace
    namespace: default
# Note any additional fields are allowed, but will be ignored
```

## Action Handler: Bulk Delete K8s Object

**ID:** a6s.k8s.kubectl.delete.bulk

**Aliases:**

- k8s.kubectl.delete.bulk
- kubectl.delete.bulk

**Example:**

```yaml
kubectl.delete.bulk:
  # object type
  kind: ObjectKind
  # [optional] k8s namespace
  namespace: default
  # minimatch patterns for object names
  names:
    - 'test-*'
```

## Action Handler: Get K8s Object

Find K8s object and assign it to context field(s)

**ID:** a6s.k8s.kubectl.get

**Aliases:**

- k8s.kubectl.get
- kubectl.get

**Example:**

```yaml
kubectl.get:
  # object type
  kind: ObjectKind
  metadata:
    # object name
    name: test
    # [optional] k8s namespace
    namespace: default
  # one of "assignTo" or "pushTo" are [required]
  assignTo: # follows common assign logic practices https://fbl.fireblink.com/plugins/common#assign-to
  pushTo: # follows common push logic practices https://fbl.fireblink.com/plugins/common#push-to
# Note any additional fields are allowed, but will be ignored
```
