package d2g

import (
	"github.com/taskcluster/shell"
	"github.com/taskcluster/taskcluster/v60/tools/d2g/genericworker"
)

func (ndi *NamedDockerImage) FileMounts() ([]genericworker.FileMount, error) {
	return []genericworker.FileMount{}, nil
}

func (ndi *NamedDockerImage) String() (string, error) {
	return shell.Escape(ndi.Name), nil
}
